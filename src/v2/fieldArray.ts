import { ChildField, ParentField } from "./field";
import { Disposable } from "./shared";

export type FieldArray<T> = ChildField<readonly T[]> &
  Readonly<{
    getFields: () => ReadonlyArray<ParentField<T>>;
    subscribeFields: (subscriber: FieldsSubscriber<T>) => Disposable;

    append: (value: T) => void;
    prepend: (value: T) => void;
    insert: (index: number, value: T) => void;
    remove: (index: number) => void;
    move: (fromIndex: number, toIndex: number) => void;
    swap: (indexA: number, indexB: number) => void;
  }>;

export type FieldsSubscriber<T> = (fields: ReadonlyArray<ParentField<T>>) => void;
