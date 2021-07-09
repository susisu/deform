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
  value?: T | undefined;
  handler: FormSubmitHandler<T>;
}>;

export class FormImpl<T> implements Form<T> {
  readonly root: FieldNode<T>;

  private handler: FormSubmitHandler<T>;

  private pendingRequestIds: Set<string>;
  private submitCount: number;

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

    this.pendingRequestIds = new Set();
    this.submitCount = 0;

    this.state = {
      isSubmitting: this.calcStateIsSubmitting(),
      submitCount: this.calcStateSubmitCount(),
    };
    this.subscribers = new Set();
    this.isDispatchQueued = false;
  }

  // depends on: pendingRequestIds
  private calcStateIsSubmitting(): boolean {
    return this.pendingRequestIds.size > 0;
  }

  // depends on: submitCount
  private calcStateSubmitCount(): number {
    return this.submitCount;
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

  private updateStateSubmitCount(): void {
    const submitCount = this.calcStateSubmitCount();
    if (this.state.submitCount === submitCount) {
      return;
    }
    this.state = { ...this.state, submitCount };
    this.queueDispatch();
  }

  submit(options?: FormSubmitOptions): Promise<void> {
    const signal = options?.signal;
    const controller = new window.AbortController();
    if (signal) {
      if (signal.aborted) {
        controller.abort();
      }
      signal.addEventListener("abort", () => {
        controller.abort();
      });
    }

    const handler = this.handler;
    const id = `FormSubmitRequest/${uniqueId()}`;
    this.pendingRequestIds.add(id);
    this.updateStateIsSubmitting();
    this.submitCount += 1;
    this.updateStateSubmitCount();

    return new Promise<void>((resolve, reject) => {
      if (controller.signal.aborted) {
        reject(new Error("Aborted"));
      }
      controller.signal.addEventListener("abort", () => {
        reject(new Error("Aborted"));
      });
      (async () => {
        const { value, errors } = await this.root.validateOnce({ signal: controller.signal });
        if (!isValid(errors)) {
          throw new Error(`Invalid: ${JSON.stringify(errors)}`); // more useful error?
        }
        await handler({ id, value, signal: controller.signal });
      })().then(resolve, (err: unknown) => {
        reject(err);
        controller.abort();
      });
    }).finally(() => {
      this.pendingRequestIds.delete(id);
      this.updateStateIsSubmitting();
    });
  }

  reset(value?: T): void {
    if (value !== undefined) {
      this.root.setDefaultValue(value);
    }
    this.root.reset();

    this.submitCount = 0;
    this.updateStateSubmitCount();
  }
}
