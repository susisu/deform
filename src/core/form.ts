export type Disposable = () => void;

export type ElementType<T extends readonly unknown[]> = T[number];

export interface Field<T> {
  readonly id: string;
  getSnapshot(): Snapshot<T>;
  subscribe(subscriber: Subscriber<T>): Disposable;
  setDefaultValue(value: T): void;
  setValue(value: T): void;
  setTouched(): void;
  setDirty(): void;
  setCustomErrors(errors: Errors): void;
  reset(): void;
  addValidator(key: string, validator: Validator<T>): Disposable;
  validate(): void;
  validateOnce(value: T, options?: ValidateOnceOptions): Promise<Errors>;
}

export type Snapshot<T> = Readonly<{
  defaultValue: T;
  value: T;
  isTouched: boolean;
  isDirty: boolean;
  errors: Errors;
  isPending: boolean;
}>;

export type Subscriber<T> = (snapshot: Snapshot<T>) => void;

export type Errors = Readonly<{ [key: string]: unknown }>;

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

export function isEqualErrors(a: Errors, b: Errors): boolean {
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

export function isValid(errors: Errors): boolean {
  const keys = Object.keys(errors);
  return keys.every(key => !errors[key]);
}

export interface FieldNode<T> extends Field<T> {
  createChild<K extends ChildKeyOf<T>>(key: K): ChildFieldNode<T[K]>;
  createChildArray<K extends ChildArrayKeyOf<T>>(key: K): ChildFieldArray<ElementType<T[K]>>;
}

export interface ChildFieldNode<T> extends FieldNode<T> {
  connect(): Disposable;
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

export interface FieldArray<T> extends Field<readonly T[]> {
  getFields(): ReadonlyArray<FieldNode<T>>;
  subscribeFields(subscriber: FieldsSubscriber<T>): Disposable;
  append(value: T): void;
  prepend(value: T): void;
  insert(index: number, value: T): void;
  remove(index: number): void;
  move(fromIndex: number, toIndex: number): void;
  swap(aIndex: number, bIndex: number): void;
}

export interface ChildFieldArray<T> extends FieldArray<T> {
  connect(): Disposable;
}

export type FieldsSubscriber<T> = (fields: ReadonlyArray<FieldNode<T>>) => void;
