import {
  Disposable,
  FieldNode,
  Form,
  FormState,
  FormStateSubscriber,
  FormSubmitHandler,
  FormSubmitOptions,
  isValid,
} from "../form";
import { FieldNodeImpl } from "./fieldNode";
import { uniqueId } from "./shared";

export type FormImplParams<T> = Readonly<{
  defaultValue: T;
  value?: T;
  handler: FormSubmitHandler<T>;
}>;

export class FormImpl<T> implements Form<T> {
  readonly root: FieldNode<T>;

  private handler: FormSubmitHandler<T>;

  private sessionId: string;

  private pendingRequestIds: Set<string>;
  private isSubmitted: boolean;

  private state: FormState;
  private subscribers: Set<FormStateSubscriber>;
  private isDispatchQueued: boolean;

  constructor(params: FormImplParams<T>) {
    this.root = new FieldNodeImpl({
      path: "$root",
      defaultValue: params.defaultValue,
      value: params.value !== undefined ? params.value : params.defaultValue,
    });

    this.handler = params.handler;

    this.sessionId = `FormSession/${uniqueId()}`;

    this.pendingRequestIds = new Set();
    this.isSubmitted = false;

    this.state = {
      isSubmitting: this.calcStateIsSubmitting(),
      isSubmitted: this.calcStateIsSubmitted(),
    };
    this.subscribers = new Set();
    this.isDispatchQueued = false;
  }

  // depends on: pendingRequestIds
  private calcStateIsSubmitting(): boolean {
    return this.pendingRequestIds.size > 0;
  }

  // depends on: isSubmitted
  private calcStateIsSubmitted(): boolean {
    return this.isSubmitted;
  }

  getState(): FormState {
    return this.state;
  }

  subscribe(subscriber: FormStateSubscriber): Disposable {
    this.subscribers.add(subscriber);
    return () => {
      this.unsubscribe(subscriber);
    };
  }

  unsubscribe(subscriber: FormStateSubscriber): void {
    this.subscribers.delete(subscriber);
  }

  private queueDispatch(): void {
    if (this.isDispatchQueued) {
      return;
    }
    this.isDispatchQueued = true;

    window.queueMicrotask(() => {
      this.isDispatchQueued = false;

      const state = this.state;
      for (const subscriber of [...this.subscribers]) {
        try {
          subscriber(state);
        } catch (err: unknown) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    });
  }

  private updateStateIsSubmitting(): void {
    const isSubmitting = this.calcStateIsSubmitting();
    if (this.state.isSubmitting === isSubmitting) {
      return;
    }
    this.state = { ...this.state, isSubmitting };
    this.queueDispatch();
  }

  private updateStateIsSubmitted(): void {
    const isSubmitted = this.calcStateIsSubmitted();
    if (this.state.isSubmitted === isSubmitted) {
      return;
    }
    this.state = { ...this.state, isSubmitted };
    this.queueDispatch();
  }

  async submit(options?: FormSubmitOptions): Promise<void> {
    const signal = options?.signal;
    const controller = new window.AbortController();
    if (signal) {
      if (signal.aborted) {
        throw new Error("Aborted");
      }
      signal.addEventListener("abort", () => {
        controller.abort();
      });
    }
    const sessionId = this.sessionId;
    const id = `FormSubmitRequest/${uniqueId()}`;
    this.pendingRequestIds.add(id);
    this.updateStateIsSubmitting();
    try {
      const { value, errors } = await this.root.validateOnce({ signal: controller.signal });
      if (!isValid(errors)) {
        throw new Error(`Invalid: ${JSON.stringify(errors)}`); // more useful error?
      }
      await new Promise((resolve, reject) => {
        controller.signal.addEventListener("abort", () => {
          reject(new Error("Aborted"));
        });
        this.handler({ id, value, signal: controller.signal }).then(resolve, reject);
      });
      if (this.sessionId === sessionId) {
        this.isSubmitted = true;
        this.updateStateIsSubmitted();
      }
    } finally {
      this.pendingRequestIds.delete(id);
      this.updateStateIsSubmitting();
    }
  }

  reset(value?: T): void {
    if (value !== undefined) {
      this.root.setDefaultValue(value);
    }
    this.root.reset();

    this.isSubmitted = false;
    this.updateStateIsSubmitted();

    this.sessionId = `FormSession/${uniqueId()}`;
  }
}
