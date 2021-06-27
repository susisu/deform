import { setImmediate } from "timers";

export function waitForMicrotasks(): Promise<void> {
  return new Promise(resolve => {
    setImmediate(() => {
      resolve();
    });
  });
}
