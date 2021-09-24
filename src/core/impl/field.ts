import { triplet } from "@susisu/promise-utils";
import { EventListener } from "../events";
import { Errors, Field, Snapshot, Subscriber, Validator, isEqualErrors, isValid } from "../field";
import { Disposable } from "../shared";
import { Child, Getter, KeyMapper, Parent, uniqueId } from "./shared";

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

  private parent: Parent<T> | undefined;
  private isConnected: boolean;

  private defaultValue: T;
  private value: T;
  private isDirty: boolean;
  private isTouched: boolean;

  private validationErrors: Errors;
  private customErrors: Errors;

  private validators: Map<string, Validator<T, unknown>>;
  private pendingValidations: Map<string, PendingValidation>;

  private dirtyChildKeys: Set<PropertyKey>;
  private touchedChildKeys: Set<PropertyKey>;
  private childrenErrors: Map<PropertyKey, Errors>;
  private childrenErrorsKeyMapper: KeyMapper;
  private pendingChildKeys: Set<PropertyKey>;

  private snapshot: Snapshot<T>;
  private subscribers: Set<Subscriber<T>>;
  private isDispatchQueued: boolean;

  private pendingPromise: Readonly<{ promise: Promise<void>; resolve: () => void }>;

  private listeners: Map<string, Set<EventListener>>;

  protected isInitializing: boolean;

  constructor(params: FieldImplParams<T>) {
    this.isInitializing = true;

    this.id = `${params.className}/${uniqueId()}`;
    this.className = params.className;
    this.path = params.path;

    this.parent = params.parent;
    this.isConnected = false;

    this.defaultValue = params.defaultValue;
    this.value = params.value;
    this.isDirty = false;
    this.isTouched = false;

    this.validationErrors = {};
    this.customErrors = {};

    this.validators = new Map();
    this.pendingValidations = new Map();

    this.dirtyChildKeys = new Set();
    this.touchedChildKeys = new Set();
    this.childrenErrors = new Map();
    this.childrenErrorsKeyMapper = key => key;
    this.pendingChildKeys = new Set();

    this.snapshot = {
      defaultValue: this.calcSnapshotDefaultValue(),
      value: this.calcSnapshotValue(),
      isDirty: this.calcSnapshotIsDirty(),
      isTouched: this.calcSnapshotIsTouched(),
      errors: this.calcSnapshotErrors(),
      isPending: this.calcSnapshotIsPending(),
    };
    this.subscribers = new Set();
    this.isDispatchQueued = false;

    const [promise, resolve] = triplet<void>();
    if (!this.snapshot.isPending) {
      resolve();
    }
    this.pendingPromise = { promise, resolve };

    this.listeners = new Map();
  }

  // depends on: defaultValue
  private calcSnapshotDefaultValue(): T {
    return this.defaultValue;
  }

  // depends on: value
  private calcSnapshotValue(): T {
    return this.value;
  }

  // depends on: isDirty, dirtyChildKeys
  private calcSnapshotIsDirty(): boolean {
    return this.isDirty || this.dirtyChildKeys.size > 0;
  }

  // depends on: isTouched, touchedChildKeys
  private calcSnapshotIsTouched(): boolean {
    return this.isTouched || this.touchedChildKeys.size > 0;
  }

  // depends on: childrenErrors, childrenErrorsKeyMapper, validationErrors, customErrors
  private calcSnapshotErrors(): Errors {
    const childrenErrorsKeyMapper = this.childrenErrorsKeyMapper;
    const childrenErrors = Object.fromEntries(
      [...this.childrenErrors].map(
        ([key, errors]) => [childrenErrorsKeyMapper(key), !isValid(errors)] as const
      )
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

  getSnapshot(): Snapshot<T> {
    return this.snapshot;
  }

  subscribe(subscriber: Subscriber<T>): Disposable {
    this.subscribers.add(subscriber);
    return () => {
      this.unsubscribe(subscriber);
    };
  }

  unsubscribe(subscriber: Subscriber<T>): void {
    this.subscribers.delete(subscriber);
  }

  private queueDispatch(): void {
    if (this.isInitializing || this.isDispatchQueued) {
      return;
    }
    this.isDispatchQueued = true;
    queueMicrotask(() => {
      this.flushDispatchQueue();
    });
  }

  flushDispatchQueue(): void {
    if (this.isDispatchQueued) {
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
    }
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

  private updateSnapshotIsDirty(): void {
    const isDirty = this.calcSnapshotIsDirty();
    if (this.snapshot.isDirty === isDirty) {
      return;
    }
    this.snapshot = { ...this.snapshot, isDirty };
    this.queueDispatch();
    this.updateParentIsDirty();
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
    if (isPending) {
      const [promise, resolve] = triplet<void>();
      this.pendingPromise = { promise, resolve };
    } else {
      this.pendingPromise.resolve();
    }
    this.updateParentIsPending();
  }

  protected getDefaultValue(): T {
    return this.defaultValue;
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

  protected getValue(): T {
    return this.value;
  }

  private bareSetValue(value: T): boolean {
    if (Object.is(this.value, value)) {
      return false;
    }
    const afterSetValue = this.beforeSetValue(value);
    this.value = value;
    this.updateSnapshotValue();
    if (afterSetValue) {
      afterSetValue();
    }
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected beforeSetValue(value: T): (() => void) | undefined {
    // noop
    return undefined;
  }

  setValue(value: T): void {
    if (this.bareSetValue(value)) {
      this.updateChildrenValue();
      this.setDirty();
      this.runAllValidators();
    }
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

  protected setChildrenErrorsKeyMapper(mapper: KeyMapper): void {
    if (this.childrenErrorsKeyMapper === mapper) {
      return;
    }
    this.childrenErrorsKeyMapper = mapper;
    this.updateSnapshotErrors();
  }

  private setValidationErrors(errors: Errors): void {
    if (this.validationErrors === errors) {
      return;
    }
    this.validationErrors = errors;
    this.updateSnapshotErrors();
  }

  setCustomErrors(errors: Errors): void {
    if (this.customErrors === errors) {
      return;
    }
    this.customErrors = errors;
    this.updateSnapshotErrors();
  }

  reset(): void {
    this.bareSetValue(this.defaultValue);
    this.setIsDirty(false);
    this.setIsTouched(false);
    this.setValidationErrors({});
    this.setCustomErrors({});
    this.resetChildren();
    this.runAllValidators();
  }

  addValidator(key: string, validator: Validator<T, unknown>): Disposable {
    if (this.validators.has(key)) {
      throw new Error(`${this.className} '${this.path}' already has a validator '${key}'`);
    }
    this.validators.set(key, validator);
    this.runValidator(key);
    return () => {
      this.removeValidator(key, validator);
    };
  }

  removeValidator(key: string, validator: Validator<T, unknown>): void {
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
    const controller = new AbortController();

    this.pendingValidations.set(key, { requestId, controller });
    this.updateSnapshotIsPending();

    const errorOrPromise = validator({
      id: requestId,
      value: this.value,
      signal: controller.signal,
    });
    if (errorOrPromise instanceof Promise) {
      errorOrPromise.then(
        error => {
          if (!controller.signal.aborted) {
            this.resolveValidation(key, requestId, error);
          }
        },
        (err: unknown) => {
          if (!controller.signal.aborted) {
            // eslint-disable-next-line no-console
            console.error(err);
            this.resolveValidation(key, requestId, true);
          }
        }
      );
    } else {
      if (!controller.signal.aborted) {
        this.resolveValidation(key, requestId, errorOrPromise);
      }
    }
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

  waitForValidation(): Promise<void> {
    return this.pendingPromise.promise;
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

  protected setChildErrors(key: PropertyKey, errors: Errors): void {
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
    this.parent.setIsDirty(this.snapshot.isDirty);
    this.parent.setIsTouched(this.snapshot.isTouched);
    this.parent.setErrors(this.snapshot.errors);
    this.parent.setIsPending(this.snapshot.isPending);
    return () => {
      this.disconnect();
    };
  }

  disconnect(): void {
    if (!this.parent) {
      throw new Error(`${this.className} '${this.path}' has no parent`);
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
      emit: (event, data) => {
        this.emit(event, data);
      },
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

  private updateParentIsDirty(): void {
    if (this.parent && this.isConnected) {
      this.parent.setIsDirty(this.snapshot.isDirty);
    }
  }

  private updateParentIsTouched(): void {
    if (this.parent && this.isConnected) {
      this.parent.setIsTouched(this.snapshot.isTouched);
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

  on(event: string, listener: EventListener): Disposable {
    let listenerSet = this.listeners.get(event);
    if (!listenerSet) {
      listenerSet = new Set();
      this.listeners.set(event, listenerSet);
    }
    listenerSet.add(listener);
    return () => {
      this.off(event, listener);
    };
  }

  off(event: string, listener: EventListener): void {
    const listenerSet = this.listeners.get(event);
    if (listenerSet) {
      listenerSet.delete(listener);
    }
  }

  emit(event: string, data?: unknown): void {
    this.emitChildren(event, data);
    const listenerSet = this.listeners.get(event);
    if (listenerSet) {
      for (const listener of [...listenerSet]) {
        try {
          listener(data);
        } catch (err: unknown) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    }
  }

  protected abstract emitChildren(event: string, data: unknown): void;
}

type PendingValidation = Readonly<{ requestId: string; controller: AbortController }>;

type MergeErrorsParams = Readonly<{
  childrenErrors: Errors;
  validationErrors: Errors;
  customErrors: Errors;
}>;

function mergeErrors(params: MergeErrorsParams): Errors {
  return {
    ...params.childrenErrors,
    ...params.validationErrors,
    ...params.customErrors,
  };
}
