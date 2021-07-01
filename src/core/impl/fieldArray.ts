import {
  Disposable,
  ElememtType,
  FieldArray,
  FieldArraySubscriber,
  FieldErrors,
  FieldNode,
  FieldSnapshot,
  FieldSubscriber,
  ValidateOnceOptions,
  Validator,
} from "../form";
import { uniqueId } from "./shared";

export class FieldArrayImpl<T> implements FieldArray<T> {
  readonly id: string;

  constructor() {
    this.id = `FieldArray/${uniqueId()}`;
  }

  getSnapshot(): FieldSnapshot<T> {
    throw new Error("not implemented");
  }

  subscribe(_subscriber: FieldSubscriber<T>): Disposable {
    throw new Error("not implemented");
  }

  setDefaultValue(_value: T): void {
    throw new Error("not implemented");
  }

  setValue(_value: T): void {
    throw new Error("not implemented");
  }

  setTouched(): void {
    throw new Error("not implemented");
  }

  setDirty(): void {
    throw new Error("not implemented");
  }

  setCustomErrors(_errors: FieldErrors): void {
    throw new Error("not implemented");
  }

  reset(): void {
    throw new Error("not implemented");
  }

  addValidator(_key: string, _validator: Validator<T>): Disposable {
    throw new Error("not implemented");
  }

  validate(): void {
    throw new Error("not implemented");
  }

  validateOnce(_value: T, _options?: ValidateOnceOptions): Promise<FieldErrors> {
    throw new Error("not implemented");
  }

  connect(): Disposable {
    throw new Error("not implemented");
  }

  getFields(): ReadonlyArray<FieldNode<ElememtType<T>>> {
    throw new Error("not implemented");
  }

  subscribeFields(_subscriber: FieldArraySubscriber<T>): Disposable {
    throw new Error("not implemented");
  }

  append(_value: ElememtType<T>): void {
    throw new Error("not implemented");
  }

  prepend(_value: ElememtType<T>): void {
    throw new Error("not implemented");
  }

  insert(_index: number, _value: ElememtType<T>): void {
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
}
