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
  private path: string;

  private parent: Parent<T> | undefined;
  private children: Map<ChildKeyOf<T>, Child<T>>;
  private isConnected: boolean;

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
    this.isConnected = false;

    this.defaultValue = params.defaultValue;
    this.value = params.value;
    this.isTouched = false;
    this.isDirty = false;

    this.validationErrors = {};
    this.customErrors = {};

    this.validators = new Map();
    this.validationStatuses = new Map();

    this.snapshot = {
      defaultValue: this.calcSnapshotDefaultValue(),
      value: this.calcSnapshotValue(),
      isTouched: this.calcSnapshotIsTouched(),
      isDirty: this.calcSnapshotIsDirty(),
      errors: this.calcSnapshotErrors(),
      isPending: this.calcSnapshotIsPending(),
    };
    this.subscribers = new Set();
    this.isDispatchQueued = false;
  }

  private calcSnapshotDefaultValue(): T {
    return this.defaultValue;
  }

  private calcSnapshotValue(): T {
    return this.value;
  }

  private calcSnapshotIsTouched(): boolean {
    return this.isTouched;
  }

  private calcSnapshotIsDirty(): boolean {
    return this.isDirty;
  }

  private calcSnapshotErrors(): FieldErrors {
    return mergeErrors({
      validationErrors: this.validationErrors,
      customErrors: this.customErrors,
    });
  }

  private calcSnapshotIsPending(): boolean {
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
    const defaultValue = this.calcSnapshotDefaultValue();
    if (Object.is(this.snapshot.defaultValue, defaultValue)) {
      return;
    }
    this.snapshot = { ...this.snapshot, defaultValue };
    this.queueDispatch();
    this.updateParentDefaultValue();
  }

  private updateSnapshotValue(): void {
    const value = this.calcSnapshotValue();
    if (Object.is(this.snapshot.value, value)) {
      return;
    }
    this.snapshot = { ...this.snapshot, value };
    this.queueDispatch();
    this.updateParentValue();
  }

  private updateSnapshotIsTouched(): void {
    const isTouched = this.calcSnapshotIsTouched();
    if (this.snapshot.isTouched === isTouched) {
      return;
    }
    this.snapshot = { ...this.snapshot, isTouched };
    this.queueDispatch();
    this.updateParentIsTouched();
  }

  private updateSnapshotIsDirty(): void {
    const isDirty = this.calcSnapshotIsDirty();
    if (this.snapshot.isDirty === isDirty) {
      return;
    }
    this.snapshot = { ...this.snapshot, isDirty };
    this.queueDispatch();
    this.updateParentIsDirty();
  }

  private updateSnapshotErrors(): void {
    const errors = this.calcSnapshotErrors();
    if (isEqualErrors(this.snapshot.errors, errors)) {
      return;
    }
    this.snapshot = { ...this.snapshot, errors };
    this.queueDispatch();
    this.updateParentErrors();
  }

  private updateSnapshotIsPending(): void {
    const isPending = this.calcSnapshotIsPending();
    if (this.snapshot.isPending === isPending) {
      return;
    }
    this.snapshot = { ...this.snapshot, isPending };
    this.queueDispatch();
    this.updateParentIsPending();
  }

  setDefaultValue(defaultValue: T): void {
    if (Object.is(this.defaultValue, defaultValue)) {
      return;
    }
    this.defaultValue = defaultValue;
    this.updateSnapshotDefaultValue();
    this.updateChildrenDefaultValue();
  }

  setValue(value: T): void {
    if (Object.is(this.value, value)) {
      return;
    }
    this.value = value;
    this.updateSnapshotValue();
    this.updateChildrenValue();
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

  addValidator(key: string, validator: Validator<T>): Disposable {
    if (this.validators.has(key)) {
      throw new Error(`FormField '${this.path}' already has a validator '${key}'`);
    }
    this.validators.set(key, validator);
    this.runValidator(key);
    return () => {
      this.removeValidator(key, validator);
    };
  }

  private removeValidator(key: string, validator: Validator<T>): void {
    if (this.validators.get(key) === validator) {
      this.abortPendingValidation(key);
      this.validationStatuses.delete(key);
      this.updateSnapshotIsPending();

      const { [key]: _, ...errors } = this.validationErrors;
      this.setValidationErrors(errors);

      this.validators.delete(key);
    }
  }

  private runValidator(key: string): void {
    const validator = this.validators.get(key);
    if (!validator) {
      // NEVER COMES HERE
      // eslint-disable-next-line no-console
      console.warn(`Unexpected: FormField '${this.path}' has no validator '${key}'`);
      return;
    }

    this.abortPendingValidation(key);

    const requestId = `ValidationRequest/${uniqueId()}`;
    const controller = new window.AbortController();
    this.validationStatuses.set(key, { type: "pending", requestId, controller });
    this.updateSnapshotIsPending();

    validator({
      id: requestId,
      onetime: false,
      value: this.value,
      resolve: error => {
        if (!controller.signal.aborted) {
          this.resolveValidation(key, requestId, error);
        }
      },
      signal: controller.signal,
    });
  }

  private abortPendingValidation(key: string): void {
    const status = this.validationStatuses.get(key);
    if (status && status.type === "pending") {
      status.controller.abort();
    }
  }

  private resolveValidation(key: string, requestId: string, error: unknown): void {
    const status = this.validationStatuses.get(key);
    if (status && status.type === "pending" && status.requestId === requestId) {
      this.setValidationErrors({ ...this.validationErrors, [key]: error });
      this.validationStatuses.set(key, { type: "done" });
      this.updateSnapshotIsPending();
    }
  }

  private runAllValidators(): void {
    for (const key of this.validators.keys()) {
      this.runValidator(key);
    }
  }

  validate(): void {
    this.runAllValidators();
  }

  private async runValidatorOnce(key: string, value: T, signal: AbortSignal): Promise<unknown> {
    if (signal.aborted) {
      // NEVER COMES HERE
      throw new Error("Aborted");
    }

    const validator = this.validators.get(key);
    if (!validator) {
      // NEVER COMES HERE
      // eslint-disable-next-line no-console
      console.warn(`Unexpected: FormField '${this.path}' has no validator '${key}'`);
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
      [...this.validators.keys()].map(key =>
        this.runValidatorOnce(key, value, signal).then(error => [key, error] as const)
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
    if (!this.parent) {
      throw new Error(`FormField '${this.path}' has no parent`);
    }
    this.isConnected = true;
    this.parent.attach();
    this.parent.setIsTouched(this.snapshot.isTouched);
    this.parent.setIsDirty(this.snapshot.isDirty);
    this.parent.setErrors(this.snapshot.errors);
    return () => {
      this.disconnect();
    };
  }

  private disconnect(): void {
    if (!this.parent) {
      throw new Error(`FormField '${this.path}' has no parent`);
    }
    if (this.isConnected) {
      this.parent.detach();
      this.isConnected = false;
    }
  }

  createChild<K extends ChildKeyOf<T>>(key: K): FieldNode<T[K]> {
    const getter: Getter<T, T[K]> = value => value[key];
    const setter: Setter<T, T[K]> = (value, x) => ({ ...value, [key]: x });
    const child: FormField<T[K]> = new FormField({
      path: `${this.path}.${String(key)}`,
      parent: this.toParent(key, setter, () => child.toChild(getter)),
      defaultValue: getter(this.defaultValue),
      value: getter(this.value),
    });
    return child;
  }

  private toParent<CT>(
    key: ChildKeyOf<T>,
    setter: Setter<T, CT>,
    lazyChild: () => Child<T>
  ): Parent<CT> {
    let child: Child<T> | undefined = undefined;
    return {
      attach: () => {
        if (!child) {
          child = lazyChild();
        }
        this.attachChild(key, child);
      },
      detach: () => {
        if (!child) {
          return;
        }
        this.detachChild(key, child);
      },
      setDefaultValue: defaultValue => {
        this.setDefaultValue(setter(this.defaultValue, defaultValue));
      },
      setValue: value => {
        this.setValue(setter(this.value, value));
      },
      setIsTouched: _isTouched => {
        // TODO
      },
      setIsDirty: _isDirty => {
        // TODO
      },
      setErrors: _errors => {
        // TODO
      },
      setIsPending: _isPending => {
        // TODO
      },
    };
  }

  private toChild<PT>(getter: Getter<PT, T>): Child<PT> {
    return {
      setDefaultValue: defaultValue => {
        this.setDefaultValue(getter(defaultValue));
      },
      setValue: value => {
        this.setValue(getter(value));
      },
      validate: () => {
        throw new Error("not implemented");
      },
      validateOnce: _value => {
        throw new Error("not implemented");
      },
    };
  }

  private attachChild<K extends ChildKeyOf<T>>(key: K, child: Child<T>): Disposable {
    if (this.children.has(key)) {
      throw new Error(`FormField '${this.path}' already has a child '${String(key)}'`);
    }
    this.children.set(key, child);
    child.setDefaultValue(this.defaultValue);
    child.setValue(this.value);
    return () => {
      this.detachChild(key, child);
    };
  }

  private detachChild<K extends ChildKeyOf<T>>(key: K, child: Child<T>): void {
    if (this.children.get(key) === child) {
      // TODO: cleanup
      this.children.delete(key);
    }
  }

  private updateParentDefaultValue(): void {
    if (this.parent && this.isConnected) {
      this.parent.setDefaultValue(this.snapshot.defaultValue);
    }
  }

  private updateParentValue(): void {
    if (this.parent && this.isConnected) {
      this.parent.setValue(this.snapshot.value);
    }
  }

  private updateParentIsTouched(): void {
    if (this.parent && this.isConnected) {
      this.parent.setIsTouched(this.snapshot.isTouched);
    }
  }

  private updateParentIsDirty(): void {
    if (this.parent && this.isConnected) {
      this.parent.setIsDirty(this.snapshot.isDirty);
    }
  }

  private updateParentErrors(): void {
    if (this.parent && this.isConnected) {
      this.parent.setErrors(this.snapshot.errors);
    }
  }

  private updateParentIsPending(): void {
    if (this.parent && this.isConnected) {
      this.parent.setIsPending(this.snapshot.isPending);
    }
  }

  private updateChildrenDefaultValue(): void {
    const defaultValue = this.defaultValue;
    for (const child of this.children.values()) {
      child.setDefaultValue(defaultValue);
    }
  }

  private updateChildrenValue(): void {
    const value = this.value;
    for (const child of this.children.values()) {
      child.setValue(value);
    }
  }
}

function isEqualErrors(a: FieldErrors, b: FieldErrors): boolean {
  if (a === b) {
    return true;
  }
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key, i) => bKeys[i] === key && Object.is(a[key], b[key]));
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
  attach: () => void;
  detach: () => void;
  setDefaultValue: (defaultValue: T) => void;
  setValue: (value: T) => void;
  setIsTouched: (isTouched: boolean) => void;
  setIsDirty: (isDirty: boolean) => void;
  setErrors: (errors: FieldErrors) => void;
  setIsPending: (isPending: boolean) => void;
}>;

type Child<T> = Readonly<{
  setDefaultValue: (defaultValue: T) => void;
  setValue: (value: T) => void;
  validate: () => void;
  validateOnce: (value: T) => Promise<FieldErrors>;
}>;

type Getter<A, B> = (a: A) => B;
type Setter<A, B> = (a: A, b: B) => A;
