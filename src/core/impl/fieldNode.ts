import {
  ChildArrayKeyOf,
  ChildFieldArray,
  ChildFieldNode,
  ChildKeyOf,
  ElementType,
} from "../field";
import { FieldImpl } from "./field";
import { FieldArrayImpl } from "./fieldArray";
import { Child, Getter, Parent, Setter } from "./shared";

export type FieldNodeImplParams<T> = Readonly<{
  path: string;
  parent?: Parent<T> | undefined;
  defaultValue: T;
  value: T;
}>;

export class FieldNodeImpl<T> extends FieldImpl<T> implements ChildFieldNode<T> {
  private children: Map<ChildKeyOf<T>, Child<T>>;

  constructor(params: FieldNodeImplParams<T>) {
    super({
      className: "FieldNode",
      path: params.path,
      parent: params.parent,
      defaultValue: params.defaultValue,
      value: params.value,
    });

    this.children = new Map();

    this.isInitializing = false;
  }

  createChild<K extends ChildKeyOf<T>>(key: K): ChildFieldNode<T[K]> {
    const path = `${this.path}.${String(key)}`;
    if (
      Object.getPrototypeOf(this.getDefaultValue()) !== Object.prototype ||
      Object.getPrototypeOf(this.getValue()) !== Object.prototype
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `You are creating a child field '${path}', but the value of '${this.path}' is not a pure object. This may cause unexpected errors.`
      );
    }
    const getter: Getter<T, T[K]> = value => value[key];
    const setter: Setter<T, T[K]> = (value, x) => {
      if (Object.is(value[key], x)) {
        return value;
      }
      // This is actually unsafe; casting pure object to T
      return { ...value, [key]: x };
    };
    const field: FieldNodeImpl<T[K]> = new FieldNodeImpl({
      path,
      parent: this.toParent(key, setter, () => field.toChild(getter)),
      defaultValue: getter(this.getDefaultValue()),
      value: getter(this.getValue()),
    });
    return field;
  }

  createChildArray<K extends ChildArrayKeyOf<T>>(key: K): ChildFieldArray<ElementType<T[K]>> {
    const path = `${this.path}.${String(key)}`;
    if (
      Object.getPrototypeOf(this.getDefaultValue()) !== Object.prototype ||
      Object.getPrototypeOf(this.getValue()) !== Object.prototype
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `You are creating a child field '${path}', but the value of '${this.path}' is not a pure object. This may cause unexpected errors.`
      );
    }
    if (
      Object.getPrototypeOf(this.getDefaultValue()[key]) !== Array.prototype ||
      Object.getPrototypeOf(this.getValue()[key]) !== Array.prototype
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `You are creating a field array '${path}', but the value of '${path}' is not a pure array. This may cause unexpected errors.`
      );
    }
    type E = ElementType<T[K]>;
    const getter: Getter<T, readonly E[]> = value => value[key];
    const setter: Setter<T, readonly E[]> = (value, x) => {
      if (Object.is(value[key], x)) {
        return value;
      }
      // This is actually unsafe; casting pure object to T, and readonly E[] to T[K]
      return { ...value, [key]: x };
    };
    const fieldArray: FieldArrayImpl<E> = new FieldArrayImpl({
      path,
      parent: this.toParent(key, setter, () => fieldArray.toChild(getter)),
      defaultValue: getter(this.getDefaultValue()),
      value: getter(this.getValue()),
    });
    return fieldArray;
  }

  private toParent<CT>(
    key: ChildKeyOf<T>,
    setter: Setter<T, CT>,
    lazyChild: () => Child<T>
  ): Parent<CT> {
    let child: Child<T> | undefined = undefined;
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
      setDefaultValue: defaultValue => {
        if (this.children.get(key) === child) {
          this.setDefaultValue(setter(this.getDefaultValue(), defaultValue));
        }
      },
      setValue: value => {
        if (this.children.get(key) === child) {
          this.setValue(setter(this.getValue(), value));
        }
      },
      setIsDirty: isDirty => {
        if (this.children.get(key) === child) {
          this.setChildIsDirty(key, isDirty);
        }
      },
      setIsTouched: isTouched => {
        if (this.children.get(key) === child) {
          this.setChildIsTouched(key, isTouched);
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

  private attachChild<K extends ChildKeyOf<T>>(key: K, child: Child<T>): void {
    if (this.children.has(key)) {
      throw new Error(`FieldNode '${this.path}' already has a child '${String(key)}'`);
    }
    this.children.set(key, child);
    child.setDefaultValue(this.getDefaultValue());
    child.setValue(this.getValue());
  }

  private detachChild<K extends ChildKeyOf<T>>(key: K, child: Child<T>): void {
    if (this.children.get(key) === child) {
      this.unsetChildIsDirty(key);
      this.unsetChildIsTouched(key);
      this.unsetChildErrors(key);
      this.unsetChildIsPending(key);
      this.children.delete(key);
    }
  }

  protected updateChildrenDefaultValue(): void {
    for (const child of this.children.values()) {
      child.setDefaultValue(this.getDefaultValue());
    }
  }

  protected updateChildrenValue(): void {
    for (const child of this.children.values()) {
      child.setValue(this.getValue());
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
}
