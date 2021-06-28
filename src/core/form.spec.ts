import { waitForMicrotasks } from "../__tests__/utils";
import { FormField } from "./form";

describe("FormField", () => {
  describe("#id", () => {
    it("starts with 'FormField/'", () => {
      const field = new FormField({
        path: "$root.test",
        defaultValue: 0,
        value: 42,
      });
      expect(field.id).toMatch(/^FormField\//);
    });

    it("is uniquely generated for each field", () => {
      const field1 = new FormField({
        path: "$root.test",
        defaultValue: 0,
        value: 42,
      });
      const field2 = new FormField({
        path: "$root.test",
        defaultValue: 0,
        value: 42,
      });
      expect(field2.id).not.toBe(field1.id);
    });
  });

  describe("#path", () => {
    it("is set by the parameter", () => {
      const field = new FormField({
        path: "$root.test",
        defaultValue: 0,
        value: 42,
      });
      expect(field.path).toBe("$root.test");
    });
  });

  describe("#getSnapshot", () => {
    it("gets the latest snapshot of the field's state", () => {
      const field = new FormField({
        path: "$root.test",
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

      // After the state updated, 'getSnapshot' returns the latest state.
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
        path: "$root.test",
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

  describe("#setValue", () => {
    it("sets the value of the field", async () => {
      const field = new FormField({
        path: "$root.test",
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
        path: "$root.test",
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
  });

  describe("#setTouched", () => {
    it("sets the field touched", async () => {
      const field = new FormField({
        path: "$root.test",
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
        path: "$root.test",
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
        path: "$root.test",
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

    // TODO
    it.todo("overrides validation errors");
  });

  describe("#addValidator", () => {
    it("throws error if the field already has a validator with the same key", () => {
      const field = new FormField({
        path: "$root.test",
        defaultValue: 0,
        value: 42,
      });

      field.addValidator("foo", () => {});

      expect(() => {
        field.addValidator("foo", () => {});
      }).toThrowError("FormField '$root.test' already has a validator 'foo'");
    });
  });
});
