import { Field, FieldArray, FieldNode, Form, FormSubmitHandler } from "../field";
import { FieldArrayImpl } from "./fieldArray";
import { FieldNodeImpl } from "./fieldNode";
import { FormImpl } from "./form";

export type CreateFormParams<T> = Readonly<{
  defaultValue: T;
  value?: T | undefined;
  handler: FormSubmitHandler<T>;
}>;

export function createForm<T>(params: CreateFormParams<T>): Form<T> {
  return new FormImpl({
    defaultValue: params.defaultValue,
    value: params.value !== undefined ? params.value : params.defaultValue,
    handler: params.handler,
  });
}

export type CreateFieldNodeParams<T> = Readonly<{
  path?: string | undefined;
  defaultValue: T;
  value?: T | undefined;
}>;

export function createFieldNode<T>(params: CreateFieldNodeParams<T>): FieldNode<T> {
  return new FieldNodeImpl({
    path: params.path ?? "$root",
    defaultValue: params.defaultValue,
    value: params.value !== undefined ? params.value : params.defaultValue,
  });
}

export type CreateFieldArrayParams<T> = Readonly<{
  path?: string | undefined;
  defaultValue: readonly T[];
  value?: readonly T[] | undefined;
}>;

export function createFieldArray<T>(params: CreateFieldArrayParams<T>): FieldArray<T> {
  return new FieldArrayImpl({
    path: params.path ?? "$root",
    defaultValue: params.defaultValue,
    value: params.value !== undefined ? params.value : params.defaultValue,
  });
}

export type CreateFieldParams<T> = CreateFieldNodeParams<T>;

export function createField<T>(params: CreateFieldParams<T>): Field<T> {
  return createFieldNode(params);
}
