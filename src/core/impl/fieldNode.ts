import { ChildArrayKeyOf, ChildKeyOf, FieldArray, FieldErrors, FieldNode, isValid } from "../form";
import { FieldImpl } from "./field";
import { Child, Getter, Parent, Setter } from "./shared";

export type FieldNodeImplParams<T> = Readonly<{
  path: string;
  parent?: Parent<T> | undefined;
  defaultValue: T;
  value: T;
}>;

export class FieldNodeImpl<T> extends FieldImpl<T> implements FieldNode<T> {
  private children: Map<ChildKeyOf<T>, Child<T>>;

  constructor(params: FieldNodeImplParams<T>) {
    super({
      tag: "FieldNode",
      path: params.path,
      parent: params.parent,
      defaultValue: params.defaultValue,
      value: params.value,
    });
    this.children = new Map();
  }

  createChild<K extends ChildKeyOf<T>>(key: K): FieldNode<T[K]> {
    const getter: Getter<T, T[K]> = value => value[key];
    const setter: Setter<T, T[K]> = (value, x) => ({ ...value, [key]: x });
    const child: FieldNodeImpl<T[K]> = new FieldNodeImpl({
      path: `${this.path}.${String(key)}`,
      parent: this.toParent(key, setter, () => child.toChild(getter)),
      defaultValue: getter(this.defaultValue),
      value: getter(this.value),
    });
    return child;
  }

  createChildArray<K extends ChildArrayKeyOf<T>>(_key: K): FieldArray<T[K]> {
    throw new Error("not implemented");
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
          this.setDefaultValue(setter(this.defaultValue, defaultValue));
        }
      },
      setValue: value => {
        if (this.children.get(key) === child) {
          this.setValue(setter(this.value, value));
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

  private toChild<PT>(getter: Getter<PT, T>): Child<PT> {
    return {
      setDefaultValue: defaultValue => {
        if (this.isConnected) {
          this.setDefaultValue(getter(defaultValue));
        }
      },
      setValue: value => {
        if (this.isConnected) {
          this.setValue(getter(value));
        }
      },
      reset: () => {
        this.reset();
      },
      validate: () => {
        this.validate();
      },
      validateOnce: (value, signal) => this.validateOnce(getter(value), { signal }),
    };
  }

  private attachChild<K extends ChildKeyOf<T>>(key: K, child: Child<T>): void {
    if (this.children.has(key)) {
      throw new Error(`FieldNode '${this.path}' already has a child '${String(key)}'`);
    }
    this.children.set(key, child);
    child.setDefaultValue(this.defaultValue);
    child.setValue(this.value);
  }

  private detachChild<K extends ChildKeyOf<T>>(key: K, child: Child<T>): void {
    if (this.children.get(key) === child) {
      this.unsetChildIsTouched(key);
      this.unsetChildIsDirty(key);
      this.unsetChildErrors(key);
      this.unsetChildIsPending(key);
      this.children.delete(key);
    }
  }

  protected updateChildrenDefaultValue(): void {
    for (const child of this.children.values()) {
      child.setDefaultValue(this.defaultValue);
    }
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

  protected async validateChildrenOnce(value: T, signal: AbortSignal): Promise<FieldErrors> {
    const entries = await Promise.all(
      [...this.children].map(([key, child]) =>
        child.validateOnce(value, signal).then(errors => [key, !isValid(errors)] as const)
      )
    );
    return Object.fromEntries(entries);
  }
}
