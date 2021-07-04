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
  private keyByIndex: readonly string[];
  private indexByKey: ReadonlyMap<string, number>;

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
    this.keyByIndex = [];
    this.indexByKey = new Map();

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
    const keyByIndex: string[] = [];
    for (let index = 0; index < value.length; index++) {
      const [key, field] = this.createChild(value[index]);
      fields.push(field);
      keyByIndex.push(key);
    }
    const indexByKey = inverseMap(keyByIndex);

    this.current = value;
    this.fields = fields;
    this.keyByIndex = keyByIndex;
    this.indexByKey = indexByKey;
    this.queueFieldsDispatch();

    return () => {
      this.setChildrenErrorsKeyMapper(createChildrenErrorsKeyMapper(indexByKey));
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

  append(value: T): void {
    const newValue = append(this.value, value);
    const [key, field] = this.createChild(value);
    const fields = append(this.fields, field);
    const keyByIndex = append(this.keyByIndex, key);
    const indexByKey = inverseMap(keyByIndex);

    this.current = newValue;
    this.fields = fields;
    this.keyByIndex = keyByIndex;
    this.indexByKey = indexByKey;
    this.queueFieldsDispatch();

    this.setValue(newValue);
    this.setChildrenErrorsKeyMapper(createChildrenErrorsKeyMapper(indexByKey));
    field.connect();
  }

  prepend(value: T): void {
    const newValue = prepend(this.value, value);
    const [key, field] = this.createChild(value);
    const fields = prepend(this.fields, field);
    const keyByIndex = prepend(this.keyByIndex, key);
    const indexByKey = inverseMap(keyByIndex);

    this.current = newValue;
    this.fields = fields;
    this.keyByIndex = keyByIndex;
    this.indexByKey = indexByKey;
    this.queueFieldsDispatch();

    this.setValue(newValue);
    this.setChildrenErrorsKeyMapper(createChildrenErrorsKeyMapper(indexByKey));
    field.connect();
  }

  insert(index: number, value: T): void {
    if (index < 0 || index > this.value.length) {
      throw new Error(
        `FieldArray '${this.path}' failed to insert: index '${index}' is out of range`
      );
    }

    const newValue = insert(this.value, index, value);
    const [key, field] = this.createChild(value);
    const fields = insert(this.fields, index, field);
    const keyByIndex = insert(this.keyByIndex, index, key);
    const indexByKey = inverseMap(keyByIndex);

    this.current = newValue;
    this.fields = fields;
    this.keyByIndex = keyByIndex;
    this.indexByKey = indexByKey;
    this.queueFieldsDispatch();

    this.setValue(newValue);
    this.setChildrenErrorsKeyMapper(createChildrenErrorsKeyMapper(indexByKey));
    field.connect();
  }

  remove(index: number): void {
    if (index < 0 || index > this.value.length) {
      throw new Error(
        `FieldArray '${this.path}' failed to remove: index '${index}' is out of range`
      );
    }

    const field = this.fields[index];
    field.disconnect();

    const newValue = remove(this.value, index);
    const fields = remove(this.fields, index);
    const keyByIndex = remove(this.keyByIndex, index);
    const indexByKey = inverseMap(keyByIndex);

    this.current = newValue;
    this.fields = fields;
    this.keyByIndex = keyByIndex;
    this.indexByKey = indexByKey;
    this.queueFieldsDispatch();

    this.setValue(newValue);
    this.setChildrenErrorsKeyMapper(createChildrenErrorsKeyMapper(indexByKey));
  }

  move(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex > this.value.length - 1) {
      throw new Error(
        `FieldArray '${this.path}' failed to move: index '${fromIndex}' is out of range`
      );
    }
    if (toIndex < 0 || toIndex > this.value.length - 1) {
      throw new Error(
        `FieldArray '${this.path}' failed to move: index '${toIndex}' is out of range`
      );
    }
    if (fromIndex === toIndex) {
      return;
    }

    const newValue = move(this.value, fromIndex, toIndex);
    const fields = move(this.fields, fromIndex, toIndex);
    const keyByIndex = move(this.keyByIndex, fromIndex, toIndex);
    const indexByKey = inverseMap(keyByIndex);

    this.current = newValue;
    this.fields = fields;
    this.keyByIndex = keyByIndex;
    this.indexByKey = indexByKey;
    this.queueFieldsDispatch();

    this.setValue(newValue);
    this.setChildrenErrorsKeyMapper(createChildrenErrorsKeyMapper(indexByKey));
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
          // expected to be always true
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

  protected async validateChildrenOnce(
    childrenErrorsKeyMapper: KeyMapper,
    signal: AbortSignal
  ): Promise<Errors> {
    const entries = await Promise.all(
      [...this.children].map(([key, child]) =>
        child
          .validateOnce(signal)
          .then(errors => [childrenErrorsKeyMapper(key), !isValid(errors)] as const)
      )
    );
    return Object.fromEntries(entries);
  }
}

function inverseMap(keyByIndex: readonly string[]): ReadonlyMap<string, number> {
  return new Map(keyByIndex.map((key, index) => [key, index]));
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

function append<T>(xs: readonly T[], x: T): readonly T[] {
  return [...xs, x];
}

function prepend<T>(xs: readonly T[], x: T): readonly T[] {
  return [x, ...xs];
}

function insert<T>(xs: readonly T[], index: number, x: T): readonly T[] {
  return [...xs.slice(0, index), x, ...xs.slice(index)];
}

function remove<T>(xs: readonly T[], index: number): readonly T[] {
  return [...xs.slice(0, index), ...xs.slice(index + 1)];
}

function move<T>(xs: readonly T[], fromIndex: number, toIndex: number): readonly T[] {
  if (fromIndex === toIndex) {
    return xs;
  } else if (fromIndex < toIndex) {
    return [
      ...xs.slice(0, fromIndex),
      ...xs.slice(fromIndex + 1, toIndex + 1),
      xs[fromIndex],
      ...xs.slice(toIndex + 1),
    ];
  } else {
    return [
      ...xs.slice(0, toIndex),
      xs[fromIndex],
      ...xs.slice(toIndex, fromIndex),
      ...xs.slice(fromIndex + 1),
    ];
  }
}
