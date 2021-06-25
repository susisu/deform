export type Disposable = () => void;

export interface Field<T> {
  readonly id: string;
  getSnapshot(): FieldSnapshot<T>;
  subscribe(subscriber: FieldSubscriber<T>): Disposable;
  setValue(value: T): void;
  touch(): void;
  setError(name: string, error: unknown): void;
  attachValidator(name: string, validator: Validator<T>): Disposable;
}

export type FieldSnapshot<T> = Readonly<{
  defaultValue: T;
  value: T;
  isDirty: boolean;
  isTouched: boolean;
  errors: FieldErrors;
  isPending: boolean;
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
