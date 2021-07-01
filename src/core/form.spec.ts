import { waitForMicrotasks } from "../__tests__/utils";
import { ValidationRequest, Validator } from "./field";
import { FormField } from "./form";

describe("FormField", () => {
  describe("#id", () => {
    it("starts with 'FormField/'", () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.id).toMatch(/^FormField\//);
    });

    it("is uniquely generated for each field", () => {
      const field1 = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      const field2 = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field2.id).not.toBe(field1.id);
    });
  });

  describe("#getSnapshot", () => {
    it("gets the latest snapshot of the field's state", () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      // Initially the field's state is initialized as follows:
      // - 'defalutValue' and 'value' are set by the parameters
      // - 'isTouched', 'isDirty', 'isPending' are set to false
      // - 'errors' is empty
      expect(field.getSnapshot()).toEqual({
        defaultValue: 0,
        value: 42,
        isTouched: false,
        isDirty: false,
        errors: {},
        isPending: false,
      });

      // After the state updated, 'getSnapshot' immediately returns the latest state.
      field.setValue(1);
      expect(field.getSnapshot()).toEqual({
        defaultValue: 0,
        value: 1,
        isTouched: false,
        isDirty: false,
        errors: {},
        isPending: false,
      });
    });
  });

  describe("#subscribe", () => {
    it("attaches a function that subscribes the field's state", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      const subscriber = jest.fn(() => {});
      const unsubscribe = field.subscribe(subscriber);

      field.setValue(1);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ value: 1 }));

      unsubscribe();
      field.setValue(2);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("#setDefaultValue", () => {
    it("sets the default value of the field", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: 0 }));

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      field.setDefaultValue(1);
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: 1 }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ defaultValue: 1 }));

      // does nothing if the same value is already set
      field.setDefaultValue(1);
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: 1 }));

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it("dispatches only once when called multiple times", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: 0 }));

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      field.setDefaultValue(1);
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: 1 }));

      field.setDefaultValue(2);
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: 2 }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ defaultValue: 2 }));
    });
  });

  describe("#setValue", () => {
    it("sets the value of the field", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ value: 42 }));

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      field.setValue(1);
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ value: 1 }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ value: 1 }));

      // does nothing if the same value is already set
      field.setValue(1);
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ value: 1 }));

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it("dispatches only once when called multiple times", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ value: 42 }));

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      field.setValue(1);
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ value: 1 }));

      field.setValue(2);
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ value: 2 }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ value: 2 }));
    });

    it("triggers validation", () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });

      const validator = jest.fn((_: ValidationRequest<number>) => {});
      field.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: 42 }));

      field.setValue(1);
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ value: 1 }));

      // does nothing if the same value is already set
      field.setValue(1);
      expect(validator).toHaveBeenCalledTimes(2);
    });
  });

  describe("#setTouched", () => {
    it("sets the field touched", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ isTouched: false }));

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      field.setTouched();
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ isTouched: true }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ isTouched: true }));

      // does nothing if the field is already touched
      field.setTouched();
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ isTouched: true }));
      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("#setDirty", () => {
    it("sets the field dirty", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ isDirty: false }));

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      field.setDirty();
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ isDirty: true }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ isDirty: true }));

      // does nothing if the field is already dirty
      field.setDirty();
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ isDirty: true }));
      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("#setCustomErrors", () => {
    it("sets custom errors of the field", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      field.setCustomErrors({ foo: true, bar: false });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true, bar: false } })
      );

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { foo: true, bar: false } })
      );

      // does nothing if the field has the same errors
      field.setCustomErrors({ foo: true, bar: false });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true, bar: false } })
      );

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it("overrides validation errors", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      const validator: Validator<number> = ({ resolve }) => {
        resolve(true);
      };
      field.addValidator("foo", validator);
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: { foo: true } }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { foo: true } })
      );

      field.setCustomErrors({ foo: false });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: { foo: false } }));

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { foo: false } })
      );

      // removing custom errors uncovers the validation errors
      field.setCustomErrors({});
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: { foo: true } }));

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { foo: true } })
      );
    });
  });

  describe("#addValidator", () => {
    it("attaches a validator to the field", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      const validator = jest.fn((_: ValidationRequest<number>) => {});
      field.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: 42,
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: {}, isPending: true })
      );

      request1.resolve(true);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      // creates a new validation request when 'value' is changed
      field.setValue(1);
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: 1,
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(request2.id).not.toBe(request1.id);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: true })
      );

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { foo: true }, isPending: true })
      );

      request2.resolve(false);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: false }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(3);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(4);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { foo: false }, isPending: false })
      );
    });

    it("aborts the pending validation request when a new request is created", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      const validator = jest.fn((_: ValidationRequest<number>) => {});
      field.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: 42 }));
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      const onAbort = jest.fn(() => {});
      request1.signal.addEventListener("abort", onAbort);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: {}, isPending: true })
      );

      expect(onAbort).toHaveBeenCalledTimes(0);

      // creates a new validation request when 'value' is changed
      field.setValue(1);
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ value: 1 }));
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));
      expect(onAbort).toHaveBeenCalledTimes(1);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: {}, isPending: true })
      );

      request2.resolve(false);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: false }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { foo: false }, isPending: false })
      );

      // resolving an aborted request has no effect
      request1.resolve(true);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: false }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(3);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
    });

    it("cleans up the error when a validator is removed", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      const validator = jest.fn((_: ValidationRequest<number>) => {});
      const removeValidator = field.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request = validator.mock.calls[0][0];
      expect(request).toEqual(expect.objectContaining({ value: 42 }));
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: {}, isPending: true })
      );

      request.resolve(true);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      removeValidator();
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: {}, isPending: false })
      );
    });

    it("cleans up the pending validation request when a validator is removed", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      const validator = jest.fn((_: ValidationRequest<number>) => {});
      const removeValidator = field.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request = validator.mock.calls[0][0];
      expect(request).toEqual(expect.objectContaining({ value: 42 }));
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      const onAbort = jest.fn(() => {});
      request.signal.addEventListener("abort", onAbort);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: {}, isPending: true })
      );

      expect(onAbort).toHaveBeenCalledTimes(0);
      removeValidator();
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );
      expect(onAbort).toHaveBeenCalledTimes(1);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      // resolving an aborted request has no effect
      request.resolve(true);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it("does nothing when a validator is removed twice", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));

      const subscriber = jest.fn(() => {});
      field.subscribe(subscriber);

      const removeValidator = field.addValidator("foo", ({ resolve }) => {
        resolve(true);
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: { foo: true } }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { foo: true } })
      );

      removeValidator();
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ errors: {} }));

      field.addValidator("foo", ({ resolve }) => {
        resolve(false);
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: { foo: false } }));

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { foo: false } })
      );

      removeValidator();
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: { foo: false } }));

      expect(subscriber).toHaveBeenCalledTimes(3);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
    });

    it("throws error if the field already has a validator with the same key", () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });

      field.addValidator("foo", () => {});

      expect(() => {
        field.addValidator("foo", () => {});
      }).toThrowError("FormField '$root' already has a validator 'foo'");
    });
  });

  describe("#validate", () => {
    it("triggers validation", () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      const validator = jest.fn((_: ValidationRequest<number>) => {});
      field.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: 42,
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      request1.resolve(true);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      field.validate();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: 42,
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(request2.id).not.toBe(request1.id);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: true })
      );

      request2.resolve(false);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: false }, isPending: false })
      );
    });

    it("triggers validation of the children", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      child.connect();
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: false }, isPending: false })
      );
      expect(child.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      const validator = jest.fn((_: ValidationRequest<number>) => {});
      child.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: 42,
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: false }, isPending: true })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      request1.resolve({});
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: true }, isPending: false })
      );
      expect(child.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: {} }, isPending: false })
      );

      parent.validate();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: 42,
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(request2.id).not.toBe(request1.id);
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: true }, isPending: true })
      );
      expect(child.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: {} }, isPending: true })
      );

      request2.resolve(null);
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: false }, isPending: false })
      );
      expect(child.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: null }, isPending: false })
      );
    });
  });

  describe("#validateOnce", () => {
    it("runs attached validators with a given value and returns the errors", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      const validator = jest.fn((_: ValidationRequest<number>) => {});
      field.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: 42,
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      request1.resolve(true);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      const promise = field.validateOnce(1);
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: true,
        value: 1,
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(request2.id).not.toBe(request1.id);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      request2.resolve(false);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      await expect(promise).resolves.toEqual({ foo: false });
    });

    it("includes custom errors in the result", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      const validator = jest.fn((_: ValidationRequest<number>) => {});
      field.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ onetime: false, value: 42 }));
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      request1.resolve(true);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      field.setCustomErrors({ foo: true, bar: true });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true, bar: true }, isPending: false })
      );

      const promise = field.validateOnce(1);
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ onetime: true, value: 1 }));
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true, bar: true }, isPending: false })
      );

      request2.resolve(false);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true, bar: true }, isPending: false })
      );

      field.setCustomErrors({ foo: false, bar: false });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: false, bar: false }, isPending: false })
      );

      // custom errors at the time when 'validateOnce' is called is used
      // custom errors overrides validation errors
      await expect(promise).resolves.toEqual({ foo: true, bar: true });
    });

    it("is aborted when the signal is aborted", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      const validator = jest.fn((_: ValidationRequest<number>) => {});
      field.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ onetime: false, value: 42 }));
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      request1.resolve(true);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      const controller = new window.AbortController();
      const promise = field.validateOnce(1, { signal: controller.signal });
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ onetime: true, value: 1 }));
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      controller.abort();

      request2.resolve(false);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      await expect(promise).rejects.toThrowError("Aborted");
    });

    it("is aborted if the signal has already been aborted", async () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      const validator = jest.fn((_: ValidationRequest<number>) => {});
      field.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ onetime: false, value: 42 }));
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      request1.resolve(true);
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: true }, isPending: false })
      );

      const controller = new window.AbortController();
      controller.abort();
      const promise = field.validateOnce(1, { signal: controller.signal });
      expect(validator).toHaveBeenCalledTimes(1);

      await expect(promise).rejects.toThrowError("Aborted");
    });

    it("runs validators attached to the children with a given value and returns the errors", async () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      child.connect();
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: false }, isPending: false })
      );
      expect(child.getSnapshot()).toEqual(
        expect.objectContaining({ errors: {}, isPending: false })
      );

      const validator = jest.fn((_: ValidationRequest<number>) => {});
      child.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: 42,
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: false }, isPending: true })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      request1.resolve({});
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: true }, isPending: false })
      );
      expect(child.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: {} }, isPending: false })
      );

      const promise = parent.validateOnce({ x: 2, y: 3 });
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: true,
        value: 2,
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(request2.id).not.toBe(request1.id);
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: true }, isPending: false })
      );
      expect(child.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: {} }, isPending: false })
      );

      request2.resolve(null);
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: true }, isPending: false })
      );
      expect(child.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: {} }, isPending: false })
      );

      await expect(promise).resolves.toEqual({ x: false });
    });
  });

  describe("#connect", () => {
    it("throws error if the field has no parent", () => {
      const field = new FormField({
        path: "$root",
        defaultValue: 0,
        value: 42,
      });
      expect(() => {
        field.connect();
      }).toThrowError("FormField '$root' has no parent");
    });

    it("throws error when trying to connect two children for the same key", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child1 = parent.createChild("x");
      const child2 = parent.createChild("x");
      child1.connect();
      expect(() => {
        child2.connect();
      }).toThrowError("FormField '$root' already has a child 'x'");
    });

    it("synchronizes a child with the parent only if they are connected", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 42, y: 43 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 42 }));

      parent.setValue({ x: 2, y: 3 });
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 2, y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 42 }));

      child.setValue(4);
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 2, y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 4 }));

      // sync
      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 2, y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 2 }));

      parent.setValue({ x: 5, y: 6 });
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 5, y: 6 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 5 }));

      child.setValue(7);
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 7, y: 6 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 7 }));

      // unsync
      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 7, y: 6 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 7 }));

      parent.setValue({ x: 8, y: 9 });
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 8, y: 9 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 7 }));

      child.setValue(10);
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 8, y: 9 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 10 }));

      // resync
      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 8, y: 9 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 8 }));
    });

    it("synchronizes the default value of a child with the parent", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ defaultValue: { x: 0, y: 1 } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: 0 }));

      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ defaultValue: { x: 0, y: 1 } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: 0 }));

      parent.setDefaultValue({ x: 2, y: 3 });
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ defaultValue: { x: 2, y: 3 } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: 2 }));

      child.setDefaultValue(4);
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ defaultValue: { x: 4, y: 3 } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: 4 }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ defaultValue: { x: 4, y: 3 } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: 4 }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ defaultValue: { x: 4, y: 3 } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: 4 }));
    });

    it("synchronizes the value of a child with the parent", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 42, y: 43 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 42 }));

      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 42, y: 43 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 42 }));

      parent.setValue({ x: 2, y: 3 });
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 2, y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 2 }));

      child.setValue(4);
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 4, y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 4 }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 4, y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 4 }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: 4, y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: 4 }));
    });

    it("synchronizes the touched state from a child to the parent", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isTouched: false }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isTouched: false }));

      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isTouched: false }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isTouched: false }));

      child.setTouched();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isTouched: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isTouched: true }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isTouched: false }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isTouched: true }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isTouched: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isTouched: true }));
    });

    it("does not synchronize the touched state from the parent to a child", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      const disconnect = child.connect();
      parent.setTouched();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isTouched: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isTouched: false }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isTouched: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isTouched: false }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isTouched: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isTouched: false }));
    });

    it("synchronizes the dirty state from a child to the parent", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isDirty: false }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isDirty: false }));

      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isDirty: false }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isDirty: false }));

      child.setDirty();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isDirty: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isDirty: true }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isDirty: false }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isDirty: true }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isDirty: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isDirty: true }));
    });

    it("does not synchronize the dirty state from the parent to a child", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      const disconnect = child.connect();
      parent.setDirty();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isDirty: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isDirty: false }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isDirty: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isDirty: false }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isDirty: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isDirty: false }));
    });

    it("synchronizes the errors from a child to the parent", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));

      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: { x: false } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));

      child.setCustomErrors({ foo: {} });
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: { x: true } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: { foo: {} } }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: { foo: {} } }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: { x: true } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: { foo: {} } }));
    });

    it("does not synchronize the errors from the parent to a child", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: { x: false } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));

      parent.setCustomErrors({ foo: {} });
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: false, foo: {} } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: { foo: {} } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: false, foo: {} } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));
    });

    it("synchronizes the pending state from a child to the parent", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isPending: false }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isPending: false }));

      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isPending: false }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isPending: false }));

      child.addValidator("foo", () => {});
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isPending: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isPending: true }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isPending: false }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isPending: true }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isPending: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isPending: true }));
    });

    it("does not synchronize the pending state from the parent to a child", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      const disconnect = child.connect();
      parent.addValidator("foo", () => {});
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isPending: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isPending: false }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isPending: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isPending: false }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isPending: true }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isPending: false }));
    });
  });

  describe("#createChild", () => {
    it("creates a child of the field", () => {
      const parent = new FormField({
        path: "$root",
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
      });
      const child = parent.createChild("x");
      expect(child.getSnapshot()).toEqual({
        defaultValue: 0,
        value: 42,
        isTouched: false,
        isDirty: false,
        errors: {},
        isPending: false,
      });
    });
  });
});
