import { ParentField } from "./field";
import { Disposable } from "./shared";

export type Form<T> = Readonly<{
  id: string;
  field: ParentField<T>;

  getState: () => FormState;
  subscribeState: (subscriber: FormStateSubscriber) => Disposable;

  submit: <R>(
    action: FormSubmitAction<T, R>,
    options?: FormSubmitOptions
  ) => Promise<FormSubmitResult<R>>;

  reset: (value?: T) => void;
}>;

export type FormState = Readonly<{
  isSubmitting: boolean;
  submitCount: number;
}>;

export type FormStateSubscriber = (stat: FormState) => void;

export type FormSubmitAction<T, R> = (req: FormSubmitRequest<T>) => Promise<R>;

export type FormSubmitRequest<T> = Readonly<{
  id: string;
  value: T;
  signal: AbortSignal;
}>;

export type FormSubmitOptions = Readonly<{
  skipValidation?: boolean | undefined;
  signal?: AbortSignal | undefined;
}>;

export type FormSubmitResult<R> =
  | Readonly<{ type: "success"; data: R }>
  | Readonly<{ type: "canceled"; reason: FormSubmitCancellationReason }>;

export type FormSubmitCancellationReason = "validationError" | "aborted";
