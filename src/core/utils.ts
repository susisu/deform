import { FieldArray, FieldNode } from "./form";
import { FieldArrayImpl } from "./impl/fieldArray";
import { FieldNodeImpl } from "./impl/fieldNode";

export type FieldNodeParams<T> = Readonly<{
  path?: string;
  defaultValue: T;
  value?: T;
}>;

export function createFieldNode<T>(params: FieldNodeParams<T>): FieldNode<T> {
  return new FieldNodeImpl({
    path: params.path ?? "$root",
    defaultValue: params.defaultValue,
    value: params.value ?? params.defaultValue,
  });
}

export type FieldArrayParams<T> = Readonly<{
  path?: string;
  defaultValue: readonly T[];
  value?: readonly T[];
}>;

export function createFieldArray<T>(params: FieldArrayParams<T>): FieldArray<T> {
  return new FieldArrayImpl({
    path: params.path ?? "$root",
    defaultValue: params.defaultValue,
    value: params.value ?? params.defaultValue,
  });
}
