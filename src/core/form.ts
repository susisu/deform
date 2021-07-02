export type Disposable = () => void;

export type ElememtType<T extends readonly unknown[]> = T[number];

export interface Field<T> {
  readonly id: string;
  getSnapshot(): FieldSnapshot<T>;
  subscribe(subscriber: FieldSubscriber<T>): Disposable;
  setDefaultValue(value: T): void;
  setValue(value: T): void;
  setTouched(): void;
  setDirty(): void;
  setCustomErrors(errors: FieldErrors): void;
  reset(): void;
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

export function isEqualErrors(a: FieldErrors, b: FieldErrors): boolean {
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

export function isValid(errors: FieldErrors): boolean {
  const keys = Object.keys(errors);
  return keys.every(key => !errors[key]);
}

export interface FieldNode<T> extends Field<T> {
  connect(): Disposable;
  createChild<K extends ChildKeyOf<T>>(key: K): FieldNode<T[K]>;
  createChildArray<K extends ChildArrayKeyOf<T>>(key: K): FieldArray<T[K]>;
}

export type ChildKeyOf<T> = [T] extends [object] ? NonIndexKey<keyof T> : never;

type NonIndexKey<K extends PropertyKey> =
  // prettier-ignore
  string extends K ? never
  : number extends K ? never
  : symbol extends K ? never
  : K;

export type ChildArrayKeyOf<T> = SelectChildArrayKey<T, ChildKeyOf<T>>;

type SelectChildArrayKey<T, K extends keyof T> =
  // prettier-ignore
  K extends unknown
    ? (T[K] extends readonly unknown[] ? K : never)
    : never;

export interface FieldArray<T extends readonly unknown[]> extends Field<T> {
  connect(): Disposable;
  getFields(): ReadonlyArray<FieldNode<ElememtType<T>>>;
  subscribeFields(subscriber: FieldArraySubscriber<T>): Disposable;
  append(value: ElememtType<T>): void;
  prepend(value: ElememtType<T>): void;
  insert(index: number, value: ElememtType<T>): void;
  remove(index: number): void;
  move(fromIndex: number, toIndex: number): void;
  swap(aIndex: number, bIndex: number): void;
}

export type FieldArraySubscriber<T extends readonly unknown[]> = (
  fields: ReadonlyArray<FieldNode<ElememtType<T>>>
) => void;
