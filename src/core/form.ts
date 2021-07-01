import {
  ChildKeyOf,
  Disposable,
  FieldErrors,
  FieldNode,
  FieldSnapshot,
  FieldSubscriber,
  ValidateOnceOptions,
  Validator,
} from "./field";

const uniqueId = (() => {
  let uniqueIdCounter = 0;
  return (): string => {
    uniqueIdCounter += 1;
    return uniqueIdCounter.toString();
  };
})();

export type FormFieldParams<T> = Readonly<{
  path: string;
  parent?: Parent<T> | undefined;
  defaultValue: T;
  value: T;
}>;

export class FormField<T> implements FieldNode<T> {
  readonly id: string;
  readonly path: string;

  private parent: Parent<T> | undefined;
  private children: Map<ChildKeyOf<T>, Child<T>>;
  private connectionStatus: ConnectionStatus;

  private defaultValue: T;
  private value: T;
  private isTouched: boolean;
  private isDirty: boolean;

  private validationErrors: FieldErrors;
  private customErrors: FieldErrors;

  private validators: Map<string, Validator<T>>;
  private validationStatuses: Map<string, ValidationStatus>;

  private snapshot: FieldSnapshot<T>;
  private subscribers: Set<FieldSubscriber<T>>;
  private isDispatchQueued: boolean;

  constructor(params: FormFieldParams<T>) {
    this.id = `FormField/${uniqueId()}`;
    this.path = params.path;

    this.parent = params.parent;
    this.children = new Map();
    this.connectionStatus = { type: "disconnected" };

    this.defaultValue = params.defaultValue;
    this.value = params.value;
    this.isTouched = false;
    this.isDirty = false;

    this.validationErrors = {};
    this.customErrors = {};

    this.validators = new Map();
    this.validationStatuses = new Map();

    this.snapshot = {
      defaultValue: this.getDefaultValue(),
      value: this.getValue(),
      isTouched: this.getIsTouched(),
      isDirty: this.getIsDirty(),
      errors: this.getErrors(),
      isPending: this.getIsPending(),
    };
    this.subscribers = new Set();
    this.isDispatchQueued = false;
  }

  private getDefaultValue(): T {
    return this.defaultValue;
  }

  private getValue(): T {
    return this.value;
  }

  private getIsTouched(): boolean {
    return this.isTouched;
  }

  private getIsDirty(): boolean {
    return this.isDirty;
  }

  private getErrors(): FieldErrors {
    return mergeErrors({
      validationErrors: this.validationErrors,
      customErrors: this.customErrors,
    });
  }

  private getIsPending(): boolean {
    for (const status of this.validationStatuses.values()) {
      if (status.type === "pending") {
        return true;
      }
    }
    return false;
  }

  getSnapshot(): FieldSnapshot<T> {
    return this.snapshot;
  }

  subscribe(subscriber: FieldSubscriber<T>): Disposable {
    this.subscribers.add(subscriber);
    return () => {
      this.unsubscribe(subscriber);
    };
  }

  private unsubscribe(subscriber: FieldSubscriber<T>): void {
    this.subscribers.delete(subscriber);
  }

  private queueDispatch(): void {
    if (this.isDispatchQueued) {
      return;
    }
    this.isDispatchQueued = true;

    window.queueMicrotask(() => {
      this.isDispatchQueued = false;

      const snapshot = this.snapshot;
      for (const subscriber of [...this.subscribers]) {
        try {
          subscriber(snapshot);
        } catch (err: unknown) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    });
  }

  private updateSnapshotDefaultValue(): void {
    const defaultValue = this.getDefaultValue();
    if (Object.is(this.snapshot.defaultValue, defaultValue)) {
      return;
    }
    this.snapshot = { ...this.snapshot, defaultValue };
    this.queueDispatch();
  }

  private updateSnapshotValue(): void {
    const value = this.getValue();
    if (Object.is(this.snapshot.value, value)) {
      return;
    }
    this.snapshot = { ...this.snapshot, value };
    this.queueDispatch();
  }

  private updateSnapshotIsTouched(): void {
    const isTouched = this.getIsTouched();
    if (this.snapshot.isTouched === isTouched) {
      return;
    }
    this.snapshot = { ...this.snapshot, isTouched };
    this.queueDispatch();
  }

  private updateSnapshotIsDirty(): void {
    const isDirty = this.getIsDirty();
    if (this.snapshot.isDirty === isDirty) {
      return;
    }
    this.snapshot = { ...this.snapshot, isDirty };
    this.queueDispatch();
  }

  private updateSnapshotErrors(): void {
    const errors = this.getErrors();
    if (isEqualErrors(this.snapshot.errors, errors)) {
      return;
    }
    this.snapshot = { ...this.snapshot, errors };
    this.queueDispatch();
  }

  private updateSnapshotIsPending(): void {
    const isPending = this.getIsPending();
    if (this.snapshot.isPending === isPending) {
      return;
    }
    this.snapshot = { ...this.snapshot, isPending };
    this.queueDispatch();
  }

  setValue(value: T): void {
    if (Object.is(this.value, value)) {
      return;
    }
    this.value = value;
    this.updateSnapshotValue();
    this.runAllValidators();
  }

  setTouched(): void {
    if (this.isTouched) {
      return;
    }
    this.isTouched = true;
    this.updateSnapshotIsTouched();
  }

  setDirty(): void {
    if (this.isDirty) {
      return;
    }
    this.isDirty = true;
    this.updateSnapshotIsDirty();
  }

  private setValidationErrors(errors: FieldErrors): void {
    if (this.validationErrors === errors) {
      return;
    }
    this.validationErrors = errors;
    this.updateSnapshotErrors();
  }

  setCustomErrors(errors: FieldErrors): void {
    if (this.customErrors === errors) {
      return;
    }
    this.customErrors = errors;
    this.updateSnapshotErrors();
  }

  addValidator(name: string, validator: Validator<T>): Disposable {
    if (this.validators.has(name)) {
      throw new Error(`FormField '${this.path}' already has a validator named '${name}'`);
    }
    this.validators.set(name, validator);
    this.runValidator(name);
    return () => {
      this.removeValidator(name, validator);
    };
  }

  private removeValidator(name: string, validator: Validator<T>): void {
    if (this.validators.get(name) === validator) {
      this.validators.delete(name);

      this.abortPendingValidation(name);
      this.validationStatuses.delete(name);
      this.updateSnapshotIsPending();

      const { [name]: _, ...errors } = this.validationErrors;
      this.setValidationErrors(errors);
    }
  }

  private runValidator(name: string): void {
    const validator = this.validators.get(name);
    if (!validator) {
      // NEVER COMES HERE
      // eslint-disable-next-line no-console
      console.warn(`Unexpected: FormField '${this.path}' has no validator named '${name}'`);
      return;
    }

    this.abortPendingValidation(name);

    const requestId = `ValidationRequest/${uniqueId()}`;
    const controller = new window.AbortController();
    this.validationStatuses.set(name, { type: "pending", requestId, controller });
    this.updateSnapshotIsPending();

    validator({
      id: requestId,
      onetime: false,
      value: this.value,
      resolve: error => {
        if (!controller.signal.aborted) {
          this.resolveValidation(name, requestId, error);
        }
      },
      signal: controller.signal,
    });
  }

  private abortPendingValidation(name: string): void {
    const status = this.validationStatuses.get(name);
    if (status && status.type === "pending") {
      status.controller.abort();
    }
  }

  private resolveValidation(name: string, requestId: string, error: unknown): void {
    const status = this.validationStatuses.get(name);
    if (status && status.type === "pending" && status.requestId === requestId) {
      this.setValidationErrors({ ...this.validationErrors, [name]: error });
      this.validationStatuses.set(name, { type: "done" });
      this.updateSnapshotIsPending();
    }
  }

  private runAllValidators(): void {
    for (const name of this.validators.keys()) {
      this.runValidator(name);
    }
  }

  validate(): void {
    this.runAllValidators();
  }

  private async runValidatorOnce(name: string, value: T, signal: AbortSignal): Promise<unknown> {
    if (signal.aborted) {
      // NEVER COMES HERE
      throw new Error("Aborted");
    }

    const validator = this.validators.get(name);
    if (!validator) {
      // NEVER COMES HERE
      // eslint-disable-next-line no-console
      console.warn(`Unexpected: FormField '${this.path}' has no validator named '${name}'`);
      return undefined;
    }

    return new Promise<unknown>((resolve, reject) => {
      signal.addEventListener("abort", () => {
        reject(new Error("Aborted"));
      });
      const requestId = `ValidationRequest/${uniqueId()}`;
      validator({
        id: requestId,
        onetime: true,
        value,
        resolve: error => {
          if (!signal.aborted) {
            resolve(error);
          }
        },
        signal,
      });
    });
  }

  private async runAllValidatorsOnce(value: T, signal: AbortSignal): Promise<FieldErrors> {
    return Promise.all(
      [...this.validators.keys()].map(name =>
        this.runValidatorOnce(name, value, signal).then(error => [name, error] as const)
      )
    ).then(entries => Object.fromEntries(entries));
  }

  async validateOnce(value: T, options?: ValidateOnceOptions): Promise<FieldErrors> {
    const signal = options?.signal;
    const controller = new window.AbortController();
    if (signal) {
      if (signal.aborted) {
        throw new Error("Aborted");
      }
      signal.addEventListener("abort", () => {
        controller.abort();
      });
    }
    const customErrors = this.customErrors;
    const validationErrors = await this.runAllValidatorsOnce(value, controller.signal);
    return mergeErrors({ validationErrors, customErrors });
  }

  connect(): Disposable {
    throw new Error("not implemented");
  }

  createChild<K extends ChildKeyOf<T>>(_key: K): FieldNode<T[K]> {
    throw new Error("not implemented");
  }
}

function isEqualErrors(a: FieldErrors, b: FieldErrors): boolean {
  if (a === b) {
    return true;
  }
  const aNames = Object.keys(a).sort();
  const bNames = Object.keys(b).sort();
  if (aNames.length !== bNames.length) {
    return false;
  }
  return aNames.every((name, i) => bNames[i] === name && Object.is(a[name], b[name]));
}

type MergeErrorsParams = Readonly<{
  validationErrors: FieldErrors;
  customErrors: FieldErrors;
}>;

function mergeErrors(params: MergeErrorsParams): FieldErrors {
  return {
    ...params.validationErrors,
    ...params.customErrors,
  };
}

type ValidationStatus =
  | Readonly<{ type: "pending"; requestId: string; controller: AbortController }>
  | Readonly<{ type: "done" }>;

type Parent<T> = Readonly<{
  connect: () => Disposable;
  setDefaultValue: (defaultValue: T) => void;
  setValue: (value: T) => void;
  setIsTouched: (isTouched: boolean) => void;
  setIsDirty: (isDirty: boolean) => void;
  setErrors: (errors: FieldErrors) => void;
}>;

type Child<T> = Readonly<{
  setDefaultValue: (defaultValue: T) => void;
  setValue: (value: T) => void;
  validate: (value: T) => void;
  validateOnce: (value: T) => Promise<FieldErrors>;
}>;

type ConnectionStatus =
  | Readonly<{ type: "disconnected" }>
  | Readonly<{ type: "connected"; onDisconnect: () => void }>;
