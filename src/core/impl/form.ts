import {
  Disposable,
  FieldNode,
  Form,
  FormState,
  FormStateSubscriber,
  FormSubmitOptions,
} from "../form";
import { FieldNodeImpl } from "./fieldNode";

export type FormImplParams<T> = Readonly<{
  defaultValue: T;
  value?: T;
}>;

export class FormImpl<T> implements Form<T> {
  readonly root: FieldNode<T>;

  constructor(params: FormImplParams<T>) {
    this.root = new FieldNodeImpl({
      path: "$root",
      defaultValue: params.defaultValue,
      value: params.value !== undefined ? params.value : params.defaultValue,
    });
  }

  getState(): FormState {
    throw new Error("not implemented");
  }

  subscribe(_subscriber: FormStateSubscriber): Disposable {
    throw new Error("not implemented");
  }

  unsubscribe(_subscriber: FormStateSubscriber): void {
    throw new Error("not implemented");
  }

  submit(_options?: FormSubmitOptions): Promise<void> {
    throw new Error("not implemented");
  }

  reset(value?: T): void {
    if (value !== undefined) {
      this.root.setDefaultValue(value);
    }
    this.root.reset();
  }
}
