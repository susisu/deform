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

  private snapshot: FieldSnapshot<T>;

  private subscribers: Set<FieldSubscriber<T>>;
  private isDispatchQueued: boolean;

  constructor(params: FormFieldParams<T>) {
    this.id = `FormField/${uniqueId()}`;
    this.path = params.path;

    this.snapshot = {
      defaultValue: params.defaultValue,
      value: params.value,
      isTouched: false,
      isDirty: false,
      isPending: false,
      errors: {},
    };

    this.subscribers = new Set();
    this.isDispatchQueued = false;
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

  private _setIsPending(isPending: boolean): void {
    if (this.snapshot.isPending === isPending) {
      return;
    }
    this.snapshot = { ...this.snapshot, isPending };
    this.queueDispatch();
  }

  private _setErrors(errors: FieldErrors): void {
    if (isEqualErrors(this.snapshot.errors, errors)) {
      return;
    }
    this.snapshot = { ...this.snapshot, errors };
    this.queueDispatch();
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

  setCustomErrors(_customErrors: FieldErrors): void {
    throw new Error("not implemented");
  }

  addValidator(_name: string, _validator: Validator<T>): Disposable {
    throw new Error("not implemented");
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
