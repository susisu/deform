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
