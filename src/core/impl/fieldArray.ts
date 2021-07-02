import { Disposable, FieldArray, FieldArraySubscriber, FieldErrors, FieldNode } from "../form";
import { FieldImpl } from "./field";
import { Parent } from "./shared";

export type FieldArrayImplParams<T> = Readonly<{
  path: string;
  parent?: Parent<readonly T[]> | undefined;
  defaultValue: readonly T[];
  value: readonly T[];
}>;

export class FieldArrayImpl<T> extends FieldImpl<readonly T[]> implements FieldArray<T> {
  constructor(params: FieldArrayImplParams<T>) {
    super({
      tag: "FieldArray",
      path: params.path,
      parent: params.parent,
      defaultValue: params.defaultValue,
      value: params.value,
    });
  }

  getFields(): ReadonlyArray<FieldNode<T>> {
    throw new Error("not implemented");
  }

  subscribeFields(_subscriber: FieldArraySubscriber<T>): Disposable {
    throw new Error("not implemented");
  }

  append(_value: T): void {
    throw new Error("not implemented");
  }

  prepend(_value: T): void {
    throw new Error("not implemented");
  }

  insert(_index: number, _value: T): void {
    throw new Error("not implemented");
  }

  remove(_index: number): void {
    throw new Error("not implemented");
  }

  move(_fromIndex: number, _toIndex: number): void {
    throw new Error("not implemented");
  }

  swap(_aIndex: number, _bIndex: number): void {
    throw new Error("not implemented");
  }

  protected updateChildrenDefaultValue(): void {
    throw new Error("not implemented");
  }

  protected updateChildrenValue(): void {
    throw new Error("not implemented");
  }

  protected resetChildren(): void {
    throw new Error("not implemented");
  }

  protected validateChildren(): void {
    throw new Error("not implemented");
  }

  protected validateChildrenOnce(_value: readonly T[], _signal: AbortSignal): Promise<FieldErrors> {
    throw new Error("not implemented");
  }
}
