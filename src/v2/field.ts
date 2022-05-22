import { Disposable } from "./shared";

export type Field<T> = Readonly<{
  id: string;

  getState: () => FieldState<T>;
  subscribeState: (subscriber: FieldStateSubscriber<T>) => Disposable;
  flushStateDispatchQueue: () => void;

  setDefaultValue: (value: T) => void;
  setValue: (value: T) => void;
  setDirty: () => void;
  setTouched: () => void;
  setCustomErrors: (key: string, errors: FieldErrors | undefined) => void;

  attachValidator: (key: string, validator: Validator<T>) => Disposable;
  validate: () => void;
  waitForValidation: () => Promise<void>;

  reset: () => void;
}>;

export type FieldState<T, E extends FieldErrors = FieldErrors> = Readonly<{
  defaultValue: T;
  value: T;
  isDirty: boolean;
  isTouched: boolean;
  isPending: boolean;
  errors: E;
}>;

export type FieldErrors = Readonly<{
  [key in PropertyKey]: unknown;
}>;

export function equalFieldErrors(a: FieldErrors, b: FieldErrors): boolean {
  if (a === b) {
    return true;
  }
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) {
    return false;
  }
  const numKeys = keysA.length;
  for (let i = 0; i < numKeys; i++) {
    const keyA = keysA[i];
    const keyB = keysB[i];
    if (keyA !== keyB || !Object.is(a[keyA], b[keyB])) {
      return false;
    }
  }
  return true;
}

export function isValid(errors: FieldErrors): boolean {
  const keys = Object.keys(errors);
  return keys.every(key => !errors[key]);
}

export type FieldStateSubscriber<T> = (state: FieldState<T>) => void;

export type Validator<T, E = unknown> = SyncValidator<T, E> | AsyncValidator<T, E>;
export type SyncValidator<T, E = unknown> = (req: ValidationRequest<T>) => E;
export type AsyncValidator<T, E = unknown> = (req: ValidationRequest<T>) => Promise<E>;

export type ValidationRequest<T> = Readonly<{
  id: string;
  value: T;
  signal: AbortSignal;
}>;

export type ChildField<T> = Field<T> &
  Readonly<{
    setParentChannel: (parentChannel: ParentFieldChannel<T>) => Disposable;
    createChildChannel: <P>(getter: (value: P) => T) => ChildFieldChannel<P>;
  }>;

export type ParentFieldChannel<T> = Readonly<{
  key: string;
  setDefaultValue: (defaultValue: T) => void;
  setValue: (value: T) => void;
  setIsDirty: (isDirty: boolean) => void;
  setIsTouched: (isTouched: boolean) => void;
  setIsPending: (isPending: boolean) => void;
  setErrors: (errors: FieldErrors) => void;
}>;

export type ChildFieldChannel<T> = Readonly<{
  setDefaultValue: (key: string, defaultValue: T) => void;
  setValue: (key: string, value: T) => void;
  validate: (key: string) => void;
  reset: (key: string) => void;
}>;

export type ParentField<T> = Field<T> &
  Readonly<{
    attachChild: <K extends ChildKeyOf<T>>(key: K, child: ChildField<T[K]>) => Disposable;
  }>;

export type ChildKeyOf<T> = [T] extends [object] ? NonIndexKey<keyof T> : never;
type NonIndexKey<K extends PropertyKey> =
  // prettier-ignore
  string extends K ? never
  : number extends K ? never
  : symbol extends K ? never
  : K;
