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

  private defaultValue: T;
  private value: T;
  private isTouched: boolean;
  private isDirty: boolean;
  private errors: FieldErrors;
  private isPending: boolean;

  private snapshot: FieldSnapshot<T>;
  private subscribers: Set<FieldSubscriber<T>>;
  private isDispatchQueued: boolean;

  constructor(params: FormFieldParams<T>) {
    this.id = `FormField/${uniqueId()}`;
    this.path = params.path;

    this.defaultValue = params.defaultValue;
    this.value = params.value;
    this.isTouched = false;
    this.isDirty = false;
    this.errors = {};
    this.isPending = false;

    this.snapshot = this.takeSnapshot();
    this.subscribers = new Set();
    this.isDispatchQueued = false;
  }

  private takeSnapshot(): FieldSnapshot<T> {
    return {
      defaultValue: this.defaultValue,
      value: this.value,
      isTouched: this.isTouched,
      isDirty: this.isDirty,
      errors: this.errors,
      isPending: this.isPending,
    };
  }

  private updateSnapshot(): void {
    const snapshot = this.takeSnapshot();
    if (isEqualSnapshot(this.snapshot, snapshot)) {
      return;
    }
    this.snapshot = snapshot;
    this.queueDispatch();
  }

  private queueDispatch(): void {
    if (this.isDispatchQueued) {
      return;
    }
    this.isDispatchQueued = true;
    window.queueMicrotask(() => {
      this.isDispatchQueued = false;
      for (const subscriber of [...this.subscribers]) {
        try {
          subscriber(this.snapshot);
        } catch (err: unknown) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    });
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

  setValue(value: T): void {
    if (Object.is(this.value, value)) {
      return;
    }
    this.value = value;
    this.updateSnapshot();
  }

  setTouched(): void {
    if (this.isTouched) {
      return;
    }
    this.isTouched = true;
    this.updateSnapshot();
  }

  setDirty(): void {
    if (this.isDirty) {
      return;
    }
    this.isDirty = true;
    this.updateSnapshot();
  }

  setErrors(_errors: FieldErrors): void {
    throw new Error("not implemented");
  }

  attachValidator(_name: string, _validator: Validator<T>): Disposable {
    throw new Error("not implemented");
  }
}

function isEqualSnapshot<T>(a: FieldSnapshot<T>, b: FieldSnapshot<T>): boolean {
  return (
    Object.is(a.defaultValue, b.defaultValue) &&
    Object.is(a.value, b.value) &&
    a.isTouched === b.isTouched &&
    a.isDirty === b.isDirty &&
    isEqualErrors(a.errors, b.errors) &&
    a.isPending === b.isPending
  );
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
