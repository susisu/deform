import { ChildField, Field } from "./field";
import { FieldNode } from "./fieldNode";
import { Disposable } from "./shared";

export type FieldArray<T> = Field<readonly T[]> &
  Readonly<{
    getFields: () => ReadonlyArray<FieldNode<T>>;
    subscribeFields: (subscriber: FieldsSubscriber<T>) => Disposable;

    append: (value: T) => void;
    prepend: (value: T) => void;
    insert: (index: number, value: T) => void;
    remove: (index: number) => void;
    move: (fromIndex: number, toIndex: number) => void;
    swap: (indexA: number, indexB: number) => void;
  }>;

export type FieldsSubscriber<T> = (fields: ReadonlyArray<FieldNode<T>>) => void;

export type ChildFieldArray<T> = FieldArray<T> & ChildField<readonly T[]>;
