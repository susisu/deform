import { FieldArray, FieldNode, Form, FormSubmitHandler } from "./form";
import { FieldArrayImpl } from "./impl/fieldArray";
import { FieldNodeImpl } from "./impl/fieldNode";
import { FormImpl } from "./impl/form";

export type FormParams<T> = Readonly<{
  defaultValue: T;
  value?: T;
  handler: FormSubmitHandler<T>;
}>;

export function createForm<T>(params: FormParams<T>): Form<T> {
  return new FormImpl({
    defaultValue: params.defaultValue,
    value: params.value !== undefined ? params.value : params.defaultValue,
    handler: params.handler,
  });
}

export type FieldNodeParams<T> = Readonly<{
  path?: string;
  defaultValue: T;
  value?: T;
}>;

export function createFieldNode<T>(params: FieldNodeParams<T>): FieldNode<T> {
  return new FieldNodeImpl({
    path: params.path ?? "$root",
    defaultValue: params.defaultValue,
    value: params.value !== undefined ? params.value : params.defaultValue,
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
    value: params.value !== undefined ? params.value : params.defaultValue,
  });
}
