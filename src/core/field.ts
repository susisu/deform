export type Disposable = () => void;

export interface Field<T> {
  readonly id: string;
  getSnapshot(): FieldSnapshot<T>;
  subscribe(subscriber: FieldSubscriber<T>): Disposable;
  setDefaultValue(value: T): void;
  setValue(value: T): void;
  setTouched(): void;
  setDirty(): void;
  setCustomErrors(errors: FieldErrors): void;
  addValidator(key: string, validator: Validator<T>): Disposable;
  validate(): void;
  validateOnce(value: T, options?: ValidateOnceOptions): Promise<FieldErrors>;
}

export type FieldSnapshot<T> = Readonly<{
  defaultValue: T;
  value: T;
  isTouched: boolean;
  isDirty: boolean;
  errors: FieldErrors;
  isPending: boolean;
}>;

export type FieldSubscriber<T> = (snapshot: FieldSnapshot<T>) => void;

export type FieldErrors = Readonly<{ [key: string]: unknown }>;

export type Validator<T> = (req: ValidationRequest<T>) => void;

export type ValidationRequest<T> = Readonly<{
  id: string;
  onetime: boolean;
  value: T;
  resolve: (error: unknown) => void;
  signal: AbortSignal;
}>;

export type ValidateOnceOptions = Readonly<{
  signal?: AbortSignal;
}>;

export function isValid(errors: FieldErrors): boolean {
  const keys = Object.keys(errors);
  return keys.every(key => !errors[key]);
}

export interface FieldNode<T> extends Field<T> {
  connect(): Disposable;
  createChild<K extends ChildKeyOf<T>>(key: K): FieldNode<T[K]>;
}

export type ChildKeyOf<T> = [T] extends [object] ? NonIndexKey<keyof T> : never;

type NonIndexKey<K extends string | number | symbol> =
  // prettier-ignore
  string extends K ? never
  : number extends K ? never
  : symbol extends K ? never
  : K;
