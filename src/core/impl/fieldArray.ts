import {
  Disposable,
  FieldArray,
  FieldArraySubscriber,
  FieldErrors,
  FieldNode,
  isValid,
} from "../form";
import { FieldImpl } from "./field";
import { FieldNodeImpl } from "./fieldNode";
import { Child, Getter, Parent, Setter, uniqueId } from "./shared";

export type FieldArrayImplParams<T> = Readonly<{
  path: string;
  parent?: Parent<readonly T[]> | undefined;
  defaultValue: readonly T[];
  value: readonly T[];
}>;

export class FieldArrayImpl<T> extends FieldImpl<readonly T[]> implements FieldArray<T> {
  private children: Map<string, Child<readonly T[]>>;
  private current: readonly T[];
  private fields: ReadonlyArray<FieldNode<T>>;
  private indexByKey: ReadonlyMap<string, number>;
  private keyByIndex: readonly string[];

  constructor(params: FieldArrayImplParams<T>) {
    super({
      className: "FieldArray",
      path: params.path,
      parent: params.parent,
      defaultValue: params.defaultValue,
      value: params.value,
    });
    this.children = new Map();
    this.current = [];
    this.fields = [];
    this.indexByKey = new Map();
    this.keyByIndex = [];
    this.sync(this.value);
  }

  private sync(value: readonly T[]): void {
    for (const [key, child] of [...this.children]) {
      this.detachChild(key, child);
    }

    const fields: Array<FieldNode<T>> = [];
    const indexByKey: Map<string, number> = new Map();
    const keyByIndex: string[] = [];
    for (let index = 0; index < value.length; index++) {
      const [key, field] = this.createChild(value[index]);
      fields.push(field);
      indexByKey.set(key, index);
      keyByIndex.push(key);
    }
    this.current = value;
    this.fields = fields;
    this.indexByKey = indexByKey;
    this.keyByIndex = keyByIndex;

    for (const field of fields) {
      field.connect();
    }
  }

  protected override beforeSetValue(value: readonly T[]): void {
    if (this.current !== value) {
      this.sync(value);
    }
  }

  getFields(): ReadonlyArray<FieldNode<T>> {
    return this.fields;
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

  private createChild(value: T): [key: string, field: FieldNode<T>] {
    const key = `FieldArrayChild/${uniqueId()}`;
    const path = `${this.path}[]`;
    const getter: Getter<readonly T[], T> = value => {
      const index = this.indexByKey.get(key);
      if (index === undefined) {
        // NEVER COMES HERE
        throw new Error(`Unexpected: failed to get value`);
      }
      return value[index];
    };
    const setter: Setter<readonly T[], T> = (value, x) => {
      const index = this.indexByKey.get(key);
      if (index === undefined) {
        // NEVER COMES HERE
        throw new Error(`Unexpected: failed to set value`);
      }
      return set(value, index, x);
    };
    const field: FieldNodeImpl<T> = new FieldNodeImpl({
      path,
      parent: this.toParent(key, setter, () => field.toChild(getter)),
      defaultValue: value,
      value,
    });
    return [key, field];
  }

  private toParent(
    key: string,
    setter: Setter<readonly T[], T>,
    lazyChild: () => Child<readonly T[]>
  ): Parent<T> {
    let child: Child<readonly T[]> | undefined = undefined;
    return {
      attach: () => {
        if (!child) {
          child = lazyChild();
        }
        this.attachChild(key, child);
      },
      detach: () => {
        if (!child) {
          // NEVER COMES HERE
          return;
        }
        this.detachChild(key, child);
      },
      setDefaultValue: () => {
        // noop
      },
      setValue: value => {
        if (this.children.get(key) === child) {
          const newValue = setter(this.value, value);
          // expected to be true
          if (newValue.length === this.current.length) {
            this.current = newValue;
          }
          this.setValue(newValue);
        }
      },
      setIsTouched: isTouched => {
        if (this.children.get(key) === child) {
          this.setChildIsTouched(key, isTouched);
        }
      },
      setIsDirty: isDirty => {
        if (this.children.get(key) === child) {
          this.setChildIsDirty(key, isDirty);
        }
      },
      setErrors: errors => {
        if (this.children.get(key) === child) {
          this.setChildErrors(key, errors);
        }
      },
      setIsPending: isPending => {
        if (this.children.get(key) === child) {
          this.setChildIsPending(key, isPending);
        }
      },
    };
  }

  private attachChild(key: string, child: Child<readonly T[]>): void {
    if (this.children.has(key)) {
      // NEVER COMES HERE
      throw new Error(`FieldArray '${this.path}' already has a child '${String(key)}'`);
    }
    this.children.set(key, child);
    child.setDefaultValue(this.defaultValue);
    child.setValue(this.value);
  }

  private detachChild(key: string, child: Child<readonly T[]>): void {
    if (this.children.get(key) === child) {
      this.unsetChildIsTouched(key);
      this.unsetChildIsDirty(key);
      this.unsetChildErrors(key);
      this.unsetChildIsPending(key);
      this.children.delete(key);
    }
  }

  protected updateChildrenDefaultValue(): void {
    // noop
  }

  protected updateChildrenValue(): void {
    for (const child of this.children.values()) {
      child.setValue(this.value);
    }
  }

  protected resetChildren(): void {
    for (const child of this.children.values()) {
      child.reset();
    }
  }

  protected validateChildren(): void {
    for (const child of this.children.values()) {
      child.validate();
    }
  }

  protected async validateChildrenOnce(
    value: readonly T[],
    signal: AbortSignal
  ): Promise<FieldErrors> {
    const entries = await Promise.all(
      [...this.children].map(([key, child]) =>
        child.validateOnce(value, signal).then(errors => [key, !isValid(errors)] as const)
      )
    );
    return Object.fromEntries(entries);
  }
}

function set<T>(arr: readonly T[], index: number, x: T): T[] {
  return [...arr.slice(0, index), x, ...arr.slice(index + 1)];
}
