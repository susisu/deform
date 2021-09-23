import { Disposable } from "./shared";

export interface EventEmitter {
  on(event: string, listener: EventListener): Disposable;
  off(event: string, listener: EventListener): void;
  emit(event: string, data?: unknown): void;
}

export type EventListener = (data: unknown) => void;
