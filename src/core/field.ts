export type Disposable = () => void;

export interface Field<T> {
  readonly id: string;
  getSnapshot(): FieldSnapshot<T>;
  subscribe(subscriber: FieldSubscriber<T>): Disposable;
  setValue(value: T): void;
  setTouched(): void;
  setDirty(): void;
  setCustomErrors(customErrors: FieldErrors): void;
  addValidator(key: string, validator: Validator<T>): Disposable;
}

export type FieldSnapshot<T> = Readonly<{
  defaultValue: T;
  value: T;
  isTouched: boolean;
  isDirty: boolean;
  isPending: boolean;
  errors: FieldErrors;
}>;

export type FieldSubscriber<T> = (snapshot: FieldSnapshot<T>) => void;

export type FieldErrors = Readonly<{ [name: string]: unknown }>;

export type Validator<T> = (req: ValidationRequest<T>) => void;

export type ValidationRequest<T> = Readonly<{
  id: string;
  onetime: boolean;
  value: T;
  resolve: (error: unknown) => void;
  reject: (reason?: string) => void;
  signal: AbortSignal;
}>;

export function isValid(errors: FieldErrors): boolean {
  const keys = Object.keys(errors);
  return keys.every(key => !errors[key]);
}
