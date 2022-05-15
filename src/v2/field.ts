export type Field<T> = Readonly<{
  id: string;

  getState: () => FieldState<T>;
  subscribeState: (subscriber: FieldStateSubscriber<T>) => void;
  unsubscribeState: (subscriber: FieldStateSubscriber<T>) => void;
  flushStateDispatchQueue: () => void;

  setDefaultValue: (value: T) => void;
  setValue: (value: T) => void;
  setDirty: () => void;
  setTouched: () => void;
  setCustomErrors: (key: string, errors: FieldErrors | undefined) => void;

  addValidator: (key: string, validator: Validator<T>) => void;
  removeValidator: (key: string, validator: Validator<T>) => void;
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
