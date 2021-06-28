import { Disposable, Field, FieldErrors, FieldSnapshot, FieldSubscriber, Validator } from "./field";

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
    return {
      ...this.validationErrors,
      ...this.customErrors,
    };
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

  private _setDefaultValue(defaultValue: T): void {
    if (Object.is(this.snapshot.defaultValue, defaultValue)) {
      return;
    }
    this.snapshot = { ...this.snapshot, defaultValue };
    this.queueDispatch();
  }

  private _setValue(value: T): void {
    if (Object.is(this.snapshot.value, value)) {
      return;
    }
    this.snapshot = { ...this.snapshot, value };
    this.runAllValidators();
    this.queueDispatch();
  }

  private _setIsTouched(isTouched: boolean): void {
    if (this.snapshot.isTouched === isTouched) {
      return;
    }
    this.snapshot = { ...this.snapshot, isTouched };
    this.queueDispatch();
  }

  private _setIsDirty(isDirty: boolean): void {
    if (this.snapshot.isDirty === isDirty) {
      return;
    }
    this.snapshot = { ...this.snapshot, isDirty };
    this.queueDispatch();
  }

  private _setErrors(errors: FieldErrors): void {
    if (isEqualErrors(this.snapshot.errors, errors)) {
      return;
    }
    this.snapshot = { ...this.snapshot, errors };
    this.queueDispatch();
  }

  private _setIsPending(isPending: boolean): void {
    if (this.snapshot.isPending === isPending) {
      return;
    }
    this.snapshot = { ...this.snapshot, isPending };
    this.queueDispatch();
  }

  private updateErrors(): void {
    const errors = this.errors();
    this._setErrors(errors);
  }

  private updateIsPending(): void {
    const isPending = this.isPending();
    this._setIsPending(isPending);
  }

  setValue(value: T): void {
    this._setValue(value);
  }

  setTouched(): void {
    this._setIsTouched(true);
  }

  setDirty(): void {
    this._setIsDirty(true);
  }

  setCustomErrors(errors: FieldErrors): void {
    if (isEqualErrors(this.customErrors, errors)) {
      return;
    }
    this.customErrors = errors;
    this.updateErrors();
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

      const { [name]: _, ...errors } = this.validationErrors;
      this.validationErrors = errors;

      this.updateErrors();
      this.updateIsPending();
    }
  }

  validate(): void {
    this.runAllValidators();
  }

  private runValidator(name: string): void {
    const validator = this.validators.get(name);
    if (!validator) {
      // eslint-disable-next-line no-console
      console.warn(`Unexpected: FormField '${this.path}' has no validator named '${name}'`);
      return;
    }

    this.abortPendingValidation(name);

    const requestId = `ValidationRequest/${uniqueId()}`;
    const controller = new window.AbortController();
    this.validationStatuses.set(name, { type: "pending", requestId, controller });

    validator({
      id: requestId,
      onetime: false,
      value: this.snapshot.value,
      resolve: error => {
        this.resolveValidation(name, requestId, error);
      },
      signal: controller.signal,
    });

    this.updateIsPending();
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
      this.validationErrors = { ...this.validationErrors, [name]: error };
      this.validationStatuses.set(name, { type: "done" });

      this.updateErrors();
      this.updateIsPending();
    }
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

type ValidationStatus =
  | Readonly<{ type: "pending"; requestId: string; controller: AbortController }>
  | Readonly<{ type: "done" }>;
