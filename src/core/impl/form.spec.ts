import { triplet } from "@susisu/promise-utils";
import { waitForMicrotasks } from "../../__tests__/utils";
import { FormSubmitRequest } from "../form";
import { FormImpl } from "./form";

describe("FormImpl", () => {
  describe("#id", () => {
    it("starts with 'Form/'", () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
      });
      expect(form.id).toMatch(/^Form\//);
    });

    it("is uniquely generated for each field", () => {
      const form1 = new FormImpl({
        defaultValue: { x: 0, y: 1 },
      });
      const form2 = new FormImpl({
        defaultValue: { x: 0, y: 1 },
      });
      expect(form2.id).not.toBe(form1.id);
    });
  });

  describe("#root", () => {
    it("is a root field of the form", () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
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
      });
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });

      await form.submit(async () => {});
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
      });
      const subscriber = jest.fn(() => {});
      const unsubscribe = form.subscribe(subscriber);

      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);

      await form.submit(async () => {});
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
      });
      const subscriber = jest.fn(() => {});
      form.subscribe(subscriber);

      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);

      await form.submit(async () => {});
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
    it("creates a request and submit it to the given action", async () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });

      const subscriber = jest.fn(() => {});
      form.subscribe(subscriber);

      const [promise, resolve] = triplet<string>();
      const action = jest.fn((_: FormSubmitRequest<{ x: number; y: number }>) => promise);
      const done = form.submit(action);
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 1,
      });
      expect(action).toHaveBeenCalledTimes(1);
      const request = action.mock.calls[0][0];
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

      resolve("foo");
      await expect(done).resolves.toBe("foo");
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

    it("fails if the action did not finish successfully", async () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });

      const [promise, , reject] = triplet<string>();
      const action = jest.fn((_: FormSubmitRequest<{ x: number; y: number }>) => promise);
      const done = form.submit(action);
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 1,
      });
      expect(action).toHaveBeenCalledTimes(1);
      const request = action.mock.calls[0][0];
      expect(request).toEqual(expect.objectContaining({ value: { x: 42, y: 43 } }));

      reject(new Error("test error"));
      await expect(done).rejects.toThrowError("test error");
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 1,
      });
    });

    it("is aborted if the signal has already been aborted", async () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });

      const action = jest.fn(async () => "foo");
      const controller = new window.AbortController();
      controller.abort();
      const done = form.submit(action, { signal: controller.signal });
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 1,
      });

      await expect(done).rejects.toThrowError("Aborted");
      expect(action).toHaveBeenCalledTimes(0);
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 1,
      });
    });

    it("is aborted when the signal is aborted", async () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });

      const action = jest.fn(
        (_: FormSubmitRequest<{ x: number; y: number }>) => new Promise<string>(() => {})
      );
      const controller = new window.AbortController();
      const done = form.submit(action, { signal: controller.signal });
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 1,
      });
      expect(action).toHaveBeenCalledTimes(1);
      const request = action.mock.calls[0][0];
      expect(request).toEqual(expect.objectContaining({ value: { x: 42, y: 43 } }));
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 1,
      });

      const onAbort = jest.fn(() => {});
      request.signal.addEventListener("abort", onAbort);

      controller.abort();
      expect(onAbort).toHaveBeenCalled();

      await expect(done).rejects.toThrowError("Aborted");
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 1,
      });
    });

    it("set isSubmitting = false after all the pending request are done", async () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      expect(form.getState()).toEqual({
        isSubmitting: false,
        submitCount: 0,
      });

      const [promise1, resolve1] = triplet<string>();
      const action1 = jest.fn((_: FormSubmitRequest<{ x: number; y: number }>) => promise1);
      const done1 = form.submit(action1);
      expect(action1).toHaveBeenCalledTimes(1);
      const request1 = action1.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: { x: 42, y: 43 } }));
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 1,
      });

      const [promise2, resolve2] = triplet<string>();
      const action2 = jest.fn((_: FormSubmitRequest<{ x: number; y: number }>) => promise2);
      const done2 = form.submit(action2);
      expect(action2).toHaveBeenCalledTimes(1);
      const request2 = action2.mock.calls[0][0];
      expect(request2).toEqual(expect.objectContaining({ value: { x: 42, y: 43 } }));
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 2,
      });

      resolve1("foo");
      await expect(done1).resolves.toBe("foo");
      expect(form.getState()).toEqual({
        isSubmitting: true,
        submitCount: 2,
      });

      resolve2("bar");
      await expect(done2).resolves.toBe("bar");
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
      });
      await form.submit(async () => {});
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
      });
      form.root.setValue({ x: 42, y: 43 });
      form.root.setDirty();
      form.root.setTouched();
      form.root.setCustomErrors({ foo: true });
      form.root.addValidator("bar", () => true);
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
      });
      form.root.setValue({ x: 42, y: 43 });
      form.root.setDirty();
      form.root.setTouched();
      form.root.setCustomErrors({ foo: true });
      form.root.addValidator("bar", () => true);
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
