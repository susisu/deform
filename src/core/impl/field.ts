import {
  Disposable,
  Field,
  FieldErrors,
  FieldSnapshot,
  FieldSubscriber,
  isEqualErrors,
  isValid,
  ValidateOnceOptions,
  Validator,
} from "../form";
import { Child, Getter, mergeErrors, Parent, PendingValidation, uniqueId } from "./shared";

export type FieldImplParams<T> = Readonly<{
  className: string;
  path: string;
  parent: Parent<T> | undefined;
  defaultValue: T;
  value: T;
}>;

export abstract class FieldImpl<T> implements Field<T> {
  readonly id: string;
  private className: string;
  protected path: string;

  protected parent: Parent<T> | undefined;
  protected isConnected: boolean;

  protected defaultValue: T;
  protected value: T;
  private isTouched: boolean;
  private isDirty: boolean;

  private validationErrors: FieldErrors;
  private customErrors: FieldErrors;

  private validators: Map<string, Validator<T>>;
  private pendingValidations: Map<string, PendingValidation>;

  private touchedChildKeys: Set<PropertyKey>;
  private dirtyChildKeys: Set<PropertyKey>;
  private childrenErrors: Map<PropertyKey, FieldErrors>;
  private pendingChildKeys: Set<PropertyKey>;

  private snapshot: FieldSnapshot<T>;
  private subscribers: Set<FieldSubscriber<T>>;
  private isDispatchQueued: boolean;

  constructor(params: FieldImplParams<T>) {
    this.id = `${params.className}/${uniqueId()}`;
    this.className = params.className;
    this.path = params.path;

    this.parent = params.parent;
    this.isConnected = false;

    this.defaultValue = params.defaultValue;
    this.value = params.value;
    this.isTouched = false;
    this.isDirty = false;

    this.validationErrors = {};
    this.customErrors = {};

    this.validators = new Map();
    this.pendingValidations = new Map();

    this.touchedChildKeys = new Set();
    this.dirtyChildKeys = new Set();
    this.childrenErrors = new Map();
    this.pendingChildKeys = new Set();

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

  // depends on: defaultValue
  private calcSnapshotDefaultValue(): T {
    return this.defaultValue;
  }

  // depends on: value
  private calcSnapshotValue(): T {
    return this.value;
  }

  // depends on: isTouched, touchedChildKeys
  private calcSnapshotIsTouched(): boolean {
    return this.isTouched || this.touchedChildKeys.size > 0;
  }

  // depends on: isDirty, dirtyChildKeys
  private calcSnapshotIsDirty(): boolean {
    return this.isDirty || this.dirtyChildKeys.size > 0;
  }

  // depends on: childrenErrors, validationErrors, customErrors
  private calcSnapshotErrors(): FieldErrors {
    const childrenErrors = Object.fromEntries(
      [...this.childrenErrors].map(([key, errors]) => [key, !isValid(errors)] as const)
    );
    return mergeErrors({
      childrenErrors,
      validationErrors: this.validationErrors,
      customErrors: this.customErrors,
    });
  }

  // depends on: pendingValidations, pendingChildKeys
  private calcSnapshotIsPending(): boolean {
    return this.pendingValidations.size > 0 || this.pendingChildKeys.size > 0;
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

  private bareSetDefaultValue(defaultValue: T): boolean {
    if (Object.is(this.defaultValue, defaultValue)) {
      return false;
    }
    this.defaultValue = defaultValue;
    this.updateSnapshotDefaultValue();
    return true;
  }

  setDefaultValue(defaultValue: T): void {
    if (this.bareSetDefaultValue(defaultValue)) {
      this.updateChildrenDefaultValue();
    }
  }

  private bareSetValue(value: T): boolean {
    if (Object.is(this.value, value)) {
      return false;
    }
    this.beforeSetValue(value);
    this.value = value;
    this.updateSnapshotValue();
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected beforeSetValue(value: T): void {
    // noop
  }

  setValue(value: T): void {
    if (this.bareSetValue(value)) {
      this.updateChildrenValue();
      this.runAllValidators();
    }
  }

  private setIsTouched(isTouched: boolean): void {
    if (this.isTouched === isTouched) {
      return;
    }
    this.isTouched = isTouched;
    this.updateSnapshotIsTouched();
  }

  setTouched(): void {
    this.setIsTouched(true);
  }

  private setIsDirty(isDirty: boolean): void {
    if (this.isDirty === isDirty) {
      return;
    }
    this.isDirty = isDirty;
    this.updateSnapshotIsDirty();
  }

  setDirty(): void {
    this.setIsDirty(true);
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

  reset(): void {
    this.bareSetValue(this.defaultValue);
    this.setIsTouched(false);
    this.setIsDirty(false);
    this.setValidationErrors({});
    this.setCustomErrors({});
    this.resetChildren();
    this.runAllValidators();
  }

  addValidator(key: string, validator: Validator<T>): Disposable {
    if (this.validators.has(key)) {
      throw new Error(`${this.className} '${this.path}' already has a validator '${key}'`);
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

      this.pendingValidations.delete(key);
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
      return;
    }

    this.abortPendingValidation(key);

    const requestId = `ValidationRequest/${uniqueId()}`;
    const controller = new window.AbortController();
    this.pendingValidations.set(key, { requestId, controller });
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
    const validation = this.pendingValidations.get(key);
    if (validation) {
      validation.controller.abort();
    }
  }

  private resolveValidation(key: string, requestId: string, error: unknown): void {
    const validation = this.pendingValidations.get(key);
    if (validation && validation.requestId === requestId) {
      this.setValidationErrors({ ...this.validationErrors, [key]: error });
      this.pendingValidations.delete(key);
      this.updateSnapshotIsPending();
    }
  }

  private runAllValidators(): void {
    for (const key of this.validators.keys()) {
      this.runValidator(key);
    }
  }

  validate(): void {
    this.validateChildren();
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
    const entries = await Promise.all(
      [...this.validators.keys()].map(key =>
        this.runValidatorOnce(key, value, signal).then(error => [key, error] as const)
      )
    );
    return Object.fromEntries(entries);
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
    try {
      const [childrenErrors, validationErrors] = await Promise.all([
        this.validateChildrenOnce(value, controller.signal),
        this.runAllValidatorsOnce(value, controller.signal),
      ]);
      return mergeErrors({ childrenErrors, validationErrors, customErrors });
    } catch (err: unknown) {
      controller.abort();
      throw err;
    }
  }

  protected setChildIsTouched(key: PropertyKey, isTouched: boolean): void {
    if (isTouched) {
      this.touchedChildKeys.add(key);
    } else {
      this.touchedChildKeys.delete(key);
    }
    this.updateSnapshotIsTouched();
  }

  protected unsetChildIsTouched(key: PropertyKey): void {
    this.touchedChildKeys.delete(key);
    this.updateSnapshotIsTouched();
  }

  protected setChildIsDirty(key: PropertyKey, isDirty: boolean): void {
    if (isDirty) {
      this.dirtyChildKeys.add(key);
    } else {
      this.dirtyChildKeys.delete(key);
    }
    this.updateSnapshotIsDirty();
  }

  protected unsetChildIsDirty(key: PropertyKey): void {
    this.dirtyChildKeys.delete(key);
    this.updateSnapshotIsDirty();
  }

  protected setChildErrors(key: PropertyKey, errors: FieldErrors): void {
    this.childrenErrors.set(key, errors);
    this.updateSnapshotErrors();
  }

  protected unsetChildErrors(key: PropertyKey): void {
    this.childrenErrors.delete(key);
    this.updateSnapshotErrors();
  }

  protected setChildIsPending(key: PropertyKey, isPending: boolean): void {
    if (isPending) {
      this.pendingChildKeys.add(key);
    } else {
      this.pendingChildKeys.delete(key);
    }
    this.updateSnapshotIsPending();
  }

  protected unsetChildIsPending(key: PropertyKey): void {
    this.pendingChildKeys.delete(key);
    this.updateSnapshotIsPending();
  }

  connect(): Disposable {
    if (!this.parent) {
      throw new Error(`${this.className} '${this.path}' has no parent`);
    }
    if (this.isConnected) {
      throw new Error(`${this.className} '${this.path}' is already connected`);
    }
    this.isConnected = true;
    this.parent.attach();
    this.parent.setDefaultValue(this.snapshot.defaultValue);
    this.parent.setValue(this.snapshot.value);
    this.parent.setIsTouched(this.snapshot.isTouched);
    this.parent.setIsDirty(this.snapshot.isDirty);
    this.parent.setErrors(this.snapshot.errors);
    this.parent.setIsPending(this.snapshot.isPending);
    return () => {
      this.disconnect();
    };
  }

  private disconnect(): void {
    if (!this.parent) {
      // NEVER COMES HERE
      return;
    }
    if (this.isConnected) {
      this.parent.detach();
      this.isConnected = false;
    }
  }

  toChild<PT>(getter: Getter<PT, T>): Child<PT> {
    return {
      setDefaultValue: defaultValue => {
        if (this.isConnected) {
          this.setDefaultValue(getter(defaultValue));
        }
      },
      setValue: value => {
        if (this.isConnected) {
          this.setValue(getter(value));
        }
      },
      reset: () => {
        this.reset();
      },
      validate: () => {
        this.validate();
      },
      validateOnce: (value, signal) => this.validateOnce(getter(value), { signal }),
    };
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

  protected abstract updateChildrenDefaultValue(): void;
  protected abstract updateChildrenValue(): void;
  protected abstract resetChildren(): void;
  protected abstract validateChildren(): void;
  protected abstract validateChildrenOnce(value: T, signal: AbortSignal): Promise<FieldErrors>;
}
