import {
  Disposable,
  Field,
  FieldErrors,
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
  defaultValue: T;
  value: T;
}>;

export class FormField<T> implements Field<T> {
  readonly id: string;
  readonly path: string;

  private subscribers: Set<FieldSubscriber<T>>;
  private isDispatchQueued: boolean;

  private validationErrors: FieldErrors;
  private customErrors: FieldErrors;

  private validators: Map<string, Validator<T>>;
  private validationStatuses: Map<string, ValidationStatus>;

  private snapshot: FieldSnapshot<T>;

  constructor(params: FormFieldParams<T>) {
    this.id = `FormField/${uniqueId()}`;
    this.path = params.path;

    this.subscribers = new Set();
    this.isDispatchQueued = false;

    this.validationErrors = {};
    this.customErrors = {};

    this.validators = new Map();
    this.validationStatuses = new Map();

    this.snapshot = {
      defaultValue: params.defaultValue,
      value: params.value,
      isTouched: false,
      isDirty: false,
      errors: this.errors(),
      isPending: this.isPending(),
    };
  }

  private errors(): FieldErrors {
    return mergeErrors({
      validationErrors: this.validationErrors,
      customErrors: this.customErrors,
    });
  }

  private isPending(): boolean {
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

  private setDefaultValue(defaultValue: T): void {
    if (Object.is(this.snapshot.defaultValue, defaultValue)) {
      return;
    }
    this.snapshot = { ...this.snapshot, defaultValue };
    this.queueDispatch();
  }

  setValue(value: T): void {
    if (Object.is(this.snapshot.value, value)) {
      return;
    }
    this.snapshot = { ...this.snapshot, value };
    this.runAllValidators();
    this.queueDispatch();
  }

  private setIsTouched(isTouched: boolean): void {
    if (this.snapshot.isTouched === isTouched) {
      return;
    }
    this.snapshot = { ...this.snapshot, isTouched };
    this.queueDispatch();
  }

  setTouched(): void {
    this.setIsTouched(true);
  }

  private setIsDirty(isDirty: boolean): void {
    if (this.snapshot.isDirty === isDirty) {
      return;
    }
    this.snapshot = { ...this.snapshot, isDirty };
    this.queueDispatch();
  }

  setDirty(): void {
    this.setIsDirty(true);
  }

  private setErrors(errors: FieldErrors): void {
    if (isEqualErrors(this.snapshot.errors, errors)) {
      return;
    }
    this.snapshot = { ...this.snapshot, errors };
    this.queueDispatch();
  }

  private setIsPending(isPending: boolean): void {
    if (this.snapshot.isPending === isPending) {
      return;
    }
    this.snapshot = { ...this.snapshot, isPending };
    this.queueDispatch();
  }

  private updateErrors(): void {
    const errors = this.errors();
    this.setErrors(errors);
  }

  private updateIsPending(): void {
    const isPending = this.isPending();
    this.setIsPending(isPending);
  }

  private setValidationErrors(errors: FieldErrors): void {
    if (isEqualErrors(this.validationErrors, errors)) {
      return;
    }
    this.validationErrors = errors;
    this.updateErrors();
  }

  setCustomErrors(errors: FieldErrors): void {
    if (isEqualErrors(this.customErrors, errors)) {
      return;
    }
    this.customErrors = errors;
    this.updateErrors();
  }

  reset(): void {
    this.setValue(this.snapshot.defaultValue);
    this.setIsTouched(false);
    this.setIsDirty(false);
    this.setValidationErrors({});
    this.setCustomErrors({});
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
      this.updateIsPending();

      const { [name]: _, ...errors } = this.validationErrors;
      this.setValidationErrors(errors);
    }
  }

  validate(): void {
    this.runAllValidators();
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
    this.updateIsPending();

    validator({
      id: requestId,
      onetime: false,
      value: this.snapshot.value,
      resolve: error => {
        if (!controller.signal.aborted) {
          this.resolveValidation(name, requestId, error);
        }
      },
      signal: controller.signal,
    });
  }

  private runAllValidators(): void {
    for (const name of this.validators.keys()) {
      this.runValidator(name);
    }
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
      this.updateIsPending();
    }
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
