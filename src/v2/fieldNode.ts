import { ChildField, ParentField } from "./field";

export type FieldNode<T> = ChildField<T> & ParentField<T>;
