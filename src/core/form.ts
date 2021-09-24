import { FieldNode } from "./field";
import { Disposable } from "./shared";

export interface Form<T> {
  readonly id: string;
  readonly root: FieldNode<T>;
  getState(): FormState;
  subscribe(subscriber: FormStateSubscriber): Disposable;
  unsubscribe(subscriber: FormStateSubscriber): void;
  submit<R>(action: FormSubmitAction<T, R>, options?: FormSubmitOptions): Promise<R>;
  reset(value?: T): void;
}

export type FormState = Readonly<{
  isSubmitting: boolean;
  submitCount: number;
}>;
export type FormStateSubscriber = (state: FormState) => void;

export type FormSubmitAction<T, R> = (req: FormSubmitRequest<T>) => Promise<R>;
export type FormSubmitRequest<T> = Readonly<{
  id: string;
  value: T;
  signal: AbortSignal;
}>;
export type FormSubmitOptions = Readonly<{
  signal?: AbortSignal | undefined;
}>;
