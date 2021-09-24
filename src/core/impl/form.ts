import { FieldNode, isValid } from "../field";
import {
  Form,
  FormState,
  FormStateSubscriber,
  FormSubmitAction,
  FormSubmitOptions,
  FormSubmitResult,
} from "../form";
import { Disposable } from "../shared";
import { FieldNodeImpl } from "./fieldNode";
import { uniqueId } from "./shared";

export type FormImplParams<T> = Readonly<{
  defaultValue: T;
  value?: T | undefined;
}>;

export class FormImpl<T> implements Form<T> {
  readonly id: string;

  readonly root: FieldNode<T>;

  private pendingRequestIds: Set<string>;
  private submitCount: number;

  private state: FormState;
  private subscribers: Set<FormStateSubscriber>;
  private isDispatchQueued: boolean;

  constructor(params: FormImplParams<T>) {
    this.id = `Form/${uniqueId()}`;

    this.root = new FieldNodeImpl({
      path: "$root",
      defaultValue: params.defaultValue,
      value: params.value !== undefined ? params.value : params.defaultValue,
    });

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

    queueMicrotask(() => {
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

  submit<R>(
    action: FormSubmitAction<T, R>,
    options?: FormSubmitOptions
  ): Promise<FormSubmitResult<R>> {
    const skipValidation = options?.skipValidation ?? false;
    const signal = options?.signal;

    const requestId = `FormSubmitRequest/${uniqueId()}`;
    const controller = new AbortController();

    this.pendingRequestIds.add(requestId);
    this.updateStateIsSubmitting();
    this.submitCount += 1;
    this.updateStateSubmitCount();

    return Promise.race([
      new Promise<FormSubmitResult<R>>(resolve => {
        if (signal) {
          if (signal.aborted) {
            resolve({ type: "canceled", reason: "aborted" });
            controller.abort();
          }
          signal.addEventListener("abort", () => {
            resolve({ type: "canceled", reason: "aborted" });
            controller.abort();
          });
        }
      }),
      (async (): Promise<FormSubmitResult<R>> => {
        this.root.emit("submit");
        if (!skipValidation) {
          while (this.root.getSnapshot().isPending) {
            if (controller.signal.aborted) {
              throw new Error(`Request '${requestId}' has been aborted`);
            }
            await this.root.waitForValidation();
          }
          if (!isValid(this.root.getSnapshot().errors)) {
            return { type: "canceled", reason: "validationError" };
          }
        }
        if (controller.signal.aborted) {
          throw new Error(`Request '${requestId}' has been aborted`);
        }
        const data = await action({
          id: requestId,
          value: this.root.getSnapshot().value,
          signal: controller.signal,
        });
        return { type: "success", data };
      })(),
    ]).finally(() => {
      this.pendingRequestIds.delete(requestId);
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
