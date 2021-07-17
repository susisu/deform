import { waitForMicrotasks } from "../../__tests__/utils";
import { FormSubmitRequest } from "../form";
import { FormImpl } from "./form";

describe("FormImpl", () => {
  describe("#id", () => {
    it("starts with 'Form/'", () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      expect(form.id).toMatch(/^Form\//);
    });

    it("is uniquely generated for each field", () => {
      const form1 = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      const form2 = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      expect(form2.id).not.toBe(form1.id);
    });
  });

  describe("#root", () => {
    it("is a root field of the form", () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      expect(form.root.getSnapshot()).toEqual({
        defaultValue: { x: 0, y: 1 },
        value: { x: 0, y: 1 },
        isDirty: false,
        isTouched: false,
        errors: {},
        isPending: false,
      });
    });

    it("can be initialized with an initial value other than the default value", () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        handler: async () => {},
      });
      expect(form.root.getSnapshot()).toEqual({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        isDirty: false,
        isTouched: false,
        errors: {},
        isPending: false,
      });
    });
  });

  describe("#getState", () => {
    it("gets the latest snapshot of the form state", async () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });

      await form.submit();
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 1,
      });
    });
  });

  describe("#subscribe", () => {
    it("attaches a function that subscribes the form state", async () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      const subscriber = jest.fn(() => {});
      const unsubscribe = form.subscribe(subscriber);

      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);

      await form.submit();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenNthCalledWith(1, {
        isSubmitting: true,
        submitCount: 1,
      });
      expect(subscriber).toHaveBeenNthCalledWith(2, {
        isSubmitting: false,
        submitCount: 1,
      });

      // can unsubscribe
      unsubscribe();
      form.reset();

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
    });
  });

  describe("#unsubscribe", () => {
    it("detaches a function that subscribes the form state", async () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      const subscriber = jest.fn(() => {});
      form.subscribe(subscriber);

      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);

      await form.submit();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenNthCalledWith(1, {
        isSubmitting: true,
        submitCount: 1,
      });
      expect(subscriber).toHaveBeenNthCalledWith(2, {
        isSubmitting: false,
        submitCount: 1,
      });

      form.unsubscribe(subscriber);
      form.reset();

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
    });
  });

  describe("#submit", () => {
    it("submits the form using the handler", async () => {
      const resolves: Array<() => void> = [];
      const handler = jest.fn(
        (_: FormSubmitRequest<{ x: number; y: number }>) =>
          new Promise<void>(resolve => {
            resolves.push(resolve);
          })
      );
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        handler,
      });
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });

      const subscriber = jest.fn(() => {});
      form.subscribe(subscriber);

      const promise = form.submit();
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 1,
      });
      expect(handler).toHaveBeenCalledTimes(1);
      const request = handler.mock.calls[0][0];
      expect(request).toEqual({
        id: expect.stringMatching(/^FormSubmitRequest\//),
        value: { x: 42, y: 43 },
        signal: expect.any(window.AbortSignal),
      });

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith({
        isSubmitting: true,
        submitCount: 1,
      });

      resolves[0]();
      await promise;
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 1,
      });
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith({
        isSubmitting: false,
        submitCount: 1,
      });
    });

    it("fails when the handler returns error", async () => {
      const rejects: Array<(err: unknown) => void> = [];
      const handler = jest.fn(
        (_: FormSubmitRequest<{ x: number; y: number }>) =>
          new Promise<void>((_, reject) => {
            rejects.push(reject);
          })
      );
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        handler,
      });
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });

      const promise = form.submit();
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 1,
      });
      expect(handler).toHaveBeenCalledTimes(1);
      const request = handler.mock.calls[0][0];
      expect(request).toEqual(expect.objectContaining({ value: { x: 42, y: 43 } }));

      rejects[0](new Error("test error"));
      await expect(promise).rejects.toThrowError("test error");
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 1,
      });
    });

    it("is aborted if the signal has already been aborted", async () => {
      const handler = jest.fn(async () => {});
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        handler,
      });
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });

      const controller = new window.AbortController();
      controller.abort();
      const promise = form.submit({ signal: controller.signal });
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 1,
      });

      await expect(promise).rejects.toThrowError("Aborted");
      expect(handler).toHaveBeenCalledTimes(0);
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 1,
      });
    });

    it("is aborted when the signal is aborted", async () => {
      const handler = jest.fn(
        (_: FormSubmitRequest<{ x: number; y: number }>) => new Promise<void>(() => {})
      );
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        handler,
      });
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });

      const controller = new window.AbortController();
      const promise = form.submit({ signal: controller.signal });
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 1,
      });
      expect(handler).toHaveBeenCalledTimes(1);
      const request = handler.mock.calls[0][0];
      expect(request).toEqual(expect.objectContaining({ value: { x: 42, y: 43 } }));
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 1,
      });

      const onAbort = jest.fn(() => {});
      request.signal.addEventListener("abort", onAbort);

      controller.abort();
      expect(onAbort).toHaveBeenCalled();

      await expect(promise).rejects.toThrowError("Aborted");
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 1,
      });
    });

    it("set isSubmitting = false after all the pending request are done", async () => {
      const resolves: Array<() => void> = [];
      const handler = jest.fn(
        (_: FormSubmitRequest<{ x: number; y: number }>) =>
          new Promise<void>(resolve => {
            resolves.push(resolve);
          })
      );
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        handler,
      });
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });

      const promise1 = form.submit();
      expect(handler).toHaveBeenCalledTimes(1);
      const request1 = handler.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: { x: 42, y: 43 } }));
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 1,
      });

      const promise2 = form.submit();
      expect(handler).toHaveBeenCalledTimes(2);
      const request2 = handler.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ value: { x: 42, y: 43 } }));
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 2,
      });

      resolves[0]();
      await promise1;
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 2,
      });

      resolves[1]();
      await promise2;
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 2,
      });
    });
  });

  describe("#reset", () => {
    it("resets the form state", async () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      await form.submit();
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 1,
      });

      form.reset();
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });
    });

    it("resets the field", () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      form.root.setValue({ x: 42, y: 43 });
      form.root.setDirty();
      form.root.setTouched();
      form.root.setCustomErrors({ foo: true });
      form.root.addValidator("bar", ({ resolve }) => {
        resolve(true);
      });
      expect(form.root.getSnapshot()).toEqual({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        isDirty: true,
        isTouched: true,
        errors: { foo: true, bar: true },
        isPending: false,
      });

      form.reset();
      expect(form.root.getSnapshot()).toEqual({
        defaultValue: { x: 0, y: 1 },
        value: { x: 0, y: 1 },
        isDirty: false,
        isTouched: false,
        errors: { bar: true },
        isPending: false,
      });
    });

    it("can set the default value before resetting", () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      form.root.setValue({ x: 42, y: 43 });
      form.root.setDirty();
      form.root.setTouched();
      form.root.setCustomErrors({ foo: true });
      form.root.addValidator("bar", ({ resolve }) => {
        resolve(true);
      });
      expect(form.root.getSnapshot()).toEqual({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        isDirty: true,
        isTouched: true,
        errors: { foo: true, bar: true },
        isPending: false,
      });

      form.reset({ x: 2, y: 3 });
      expect(form.root.getSnapshot()).toEqual({
        defaultValue: { x: 2, y: 3 },
        value: { x: 2, y: 3 },
        isDirty: false,
        isTouched: false,
        errors: { bar: true },
        isPending: false,
      });
    });
  });
});
