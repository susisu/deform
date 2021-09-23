import { FieldNode } from "./field";
import { Disposable } from "./shared";

export interface Form<T> {
  readonly id: string;
  readonly root: FieldNode<T>;
  getState(): FormState;
  subscribe(subscriber: FormStateSubscriber): Disposable;
  unsubscribe(subscriber: FormStateSubscriber): void;
  submit(action: FormSubmitAction<T>, options?: FormSubmitOptions): Promise<void>;
  reset(value?: T): void;
}

export type FormState = Readonly<{
  isSubmitting: boolean;
  submitCount: number;
}>;
export type FormStateSubscriber = (state: FormState) => void;

export type FormSubmitAction<T> = (req: FormSubmitRequest<T>) => Promise<void>;
export type FormSubmitRequest<T> = Readonly<{
  id: string;
  value: T;
  signal: AbortSignal;
}>;
export type FormSubmitOptions = Readonly<{
  signal?: AbortSignal | undefined;
}>;
