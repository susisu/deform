import { ChildField, Field } from "./field";
import { Disposable } from "./shared";

export type FieldNode<T> = Field<T> &
  Readonly<{
    attachChild: <K extends ChildKeyOf<T>>(key: K, child: ChildField<T[K]>) => Disposable;
  }>;

type ChildKeyOf<T> = [T] extends [object] ? NonIndexKey<keyof T> : never;
type NonIndexKey<K extends PropertyKey> =
  // prettier-ignore
  string extends K ? never
  : number extends K ? never
  : symbol extends K ? never
  : K;

export type ChildFieldNode<T> = FieldNode<T> & ChildField<T>;
