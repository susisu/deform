import {
  ChildFieldArray,
  ChildFieldNode,
  Disposable,
  Errors,
  FieldNode,
  FieldsSubscriber,
  isValid,
} from "../form";
import { FieldImpl, KeyMapper } from "./field";
import { FieldNodeImpl } from "./fieldNode";
import { Child, Getter, Parent, Setter, uniqueId } from "./shared";

export type FieldArrayImplParams<T> = Readonly<{
  path: string;
  parent?: Parent<readonly T[]> | undefined;
  defaultValue: readonly T[];
  value: readonly T[];
}>;

export class FieldArrayImpl<T> extends FieldImpl<readonly T[]> implements ChildFieldArray<T> {
  private children: Map<string, Child<readonly T[]>>;

  private current: readonly T[];
  private fields: ReadonlyArray<ChildFieldNode<T>>;
  private indexByKey: ReadonlyMap<string, number>;
  private keyByIndex: readonly string[];

  private fieldsSubscribers: Set<FieldsSubscriber<T>>;
  private isFieldsDispatchQueued: boolean;

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

    this.fieldsSubscribers = new Set();
    this.isFieldsDispatchQueued = false;

    const connect = this.sync(this.value);
    connect();

    this.isInitializing = false;
  }

  private sync(value: readonly T[]): () => void {
    for (const field of this.fields) {
      field.disconnect();
    }

    const fields: Array<ChildFieldNode<T>> = [];
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
    this.setChildrenErrorsKeyMapper(createChildrenErrorsKeyMapper(indexByKey));
    this.queueFieldsDispatch();

    return () => {
      for (const field of fields) {
        field.connect();
      }
    };
  }

  protected override beforeSetValue(value: readonly T[]): (() => void) | undefined {
    if (this.current === value) {
      return undefined;
    }
    const connect = this.sync(value);
    return () => {
      connect();
    };
  }

  getFields(): ReadonlyArray<FieldNode<T>> {
    return this.fields;
  }

  subscribeFields(subscriber: FieldsSubscriber<T>): Disposable {
    this.fieldsSubscribers.add(subscriber);
    return () => {
      this.unsubscribeFields(subscriber);
    };
  }

  unsubscribeFields(subscriber: FieldsSubscriber<T>): void {
    this.fieldsSubscribers.delete(subscriber);
  }

  private queueFieldsDispatch(): void {
    if (this.isInitializing || this.isFieldsDispatchQueued) {
      return;
    }
    this.isFieldsDispatchQueued = true;

    window.queueMicrotask(() => {
      this.isFieldsDispatchQueued = false;

      const fields = this.fields;
      for (const subscriber of [...this.fieldsSubscribers]) {
        try {
          subscriber(fields);
        } catch (err: unknown) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    });
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

  private createChild(value: T): [key: string, field: ChildFieldNode<T>] {
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

  protected async validateChildrenOnce(value: readonly T[], signal: AbortSignal): Promise<Errors> {
    const entries = await Promise.all(
      [...this.children].map(([key, child]) =>
        child.validateOnce(value, signal).then(errors => [key, !isValid(errors)] as const)
      )
    );
    return Object.fromEntries(entries);
  }
}

function createChildrenErrorsKeyMapper(indexByKey: ReadonlyMap<string, number>): KeyMapper {
  return key => {
    if (typeof key === "string") {
      const index = indexByKey.get(key);
      if (index !== undefined) {
        return index;
      }
    }
    return key;
  };
}

function set<T>(xs: readonly T[], index: number, x: T): readonly T[] {
  if (Object.is(xs[index], x)) {
    return xs;
  }
  return [...xs.slice(0, index), x, ...xs.slice(index + 1)];
}
