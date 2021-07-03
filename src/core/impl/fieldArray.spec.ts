import { waitForMicrotasks } from "../../__tests__/utils";
import { FieldNode, ValidationRequest, Validator } from "../form";
import { FieldArrayImpl } from "./fieldArray";

describe("FieldArrayImpl", () => {
  describe("#id", () => {
    it("starts with 'FieldArray/'", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.id).toMatch(/^FieldArray\//);
    });

    it("is uniquely generated for each field array", () => {
      const field1 = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const field2 = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(field2.id).not.toBe(field1.id);
    });
  });

  describe("#getSnapshot", () => {
    it("gets the latest snapshot of the field's state", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      // Initially the field array's state is initialized as follows:
      // - 'defalutValue' and 'value' are set by the parameters
      // - 'isTouched', 'isDirty', 'isPending' are set to false
      // - 'errors' is set by the children
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [42],
        isTouched: false,
        isDirty: false,
        errors: { 0: false },
        isPending: false,
      });

      // After the state updated, 'getSnapshot' immediately returns the latest state.
      fieldArray.setValue([1, 2]);
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [1, 2],
        isTouched: false,
        isDirty: false,
        errors: { 0: false, 1: false },
        isPending: false,
      });
    });
  });

  describe("#subscribe", () => {
    it("attaches a function that subscribes the field's state", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const subscriber = jest.fn(() => {});
      const unsubscribe = fieldArray.subscribe(subscriber);

      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);

      fieldArray.setValue([1, 2]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ value: [1, 2] }));

      // can unsubscribe
      unsubscribe();
      fieldArray.setValue([3]);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("#unsubscribe", () => {
    it("detaches a function that subscribes the field's state", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);

      fieldArray.setValue([1, 2]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ value: [1, 2] }));

      fieldArray.unsubscribe(subscriber);
      fieldArray.setValue([3]);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("#getFields", () => {
    it("gets the latest snapshot of the child fields", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const fields1 = fieldArray.getFields();
      expect(fields1).toHaveLength(1);
      expect(fields1.map(field => field.getSnapshot())).toEqual([
        {
          defaultValue: 42,
          value: 42,
          isTouched: false,
          isDirty: false,
          errors: {},
          isPending: false,
        },
      ]);

      fieldArray.setValue([1, 2]);
      const fields2 = fieldArray.getFields();
      expect(fields2).toHaveLength(2);
      expect(fields2.map(field => field.getSnapshot())).toEqual([
        {
          defaultValue: 1,
          value: 1,
          isTouched: false,
          isDirty: false,
          errors: {},
          isPending: false,
        },
        {
          defaultValue: 2,
          value: 2,
          isTouched: false,
          isDirty: false,
          errors: {},
          isPending: false,
        },
      ]);
    });
  });

  describe("#subscribeFields", () => {
    it("attaches a function that subscribes the child fields", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const subscriber = jest.fn((_: ReadonlyArray<FieldNode<number>>) => {});
      const unsubscribe = fieldArray.subscribeFields(subscriber);

      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);

      fieldArray.setValue([1, 2]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      const fields = subscriber.mock.calls[0][0];
      expect(fields).toHaveLength(2);
      expect(fields.map(field => field.getSnapshot())).toEqual([
        {
          defaultValue: 1,
          value: 1,
          isTouched: false,
          isDirty: false,
          errors: {},
          isPending: false,
        },
        {
          defaultValue: 2,
          value: 2,
          isTouched: false,
          isDirty: false,
          errors: {},
          isPending: false,
        },
      ]);

      // can unsubscribe
      unsubscribe();
      fieldArray.setValue([3]);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("#unsubscribeFields", () => {
    it("detaches a function that subscribes the child fields", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const subscriber = jest.fn((_: ReadonlyArray<FieldNode<number>>) => {});
      fieldArray.subscribeFields(subscriber);

      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);

      fieldArray.setValue([1, 2]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      const fields = subscriber.mock.calls[0][0];
      expect(fields).toHaveLength(2);
      expect(fields.map(field => field.getSnapshot())).toEqual([
        {
          defaultValue: 1,
          value: 1,
          isTouched: false,
          isDirty: false,
          errors: {},
          isPending: false,
        },
        {
          defaultValue: 2,
          value: 2,
          isTouched: false,
          isDirty: false,
          errors: {},
          isPending: false,
        },
      ]);

      fieldArray.unsubscribeFields(subscriber);
      fieldArray.setValue([3]);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("#setDefaultValue", () => {
    it("sets the default value of the field array", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: [0] }));

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      const newDefaultValue = [1, 2];
      fieldArray.setDefaultValue(newDefaultValue);
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: [1, 2] }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ defaultValue: [1, 2] })
      );

      // does nothing if the same value is already set
      fieldArray.setDefaultValue(newDefaultValue);
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: [1, 2] }));

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it("dispatches only once when called multiple times", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: [0] }));

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.setDefaultValue([1, 2]);
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: [1, 2] }));

      fieldArray.setDefaultValue([3]);
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: [3] }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ defaultValue: [3] }));
    });

    it("does not affect the child fields", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const fields1 = fieldArray.getFields();
      expect(fields1).toHaveLength(1);
      expect(fields1.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42 }),
      ]);

      const subscriber = jest.fn(() => {});
      fieldArray.subscribeFields(subscriber);

      const newDefaultValue = [1, 2];
      fieldArray.setDefaultValue(newDefaultValue);
      const fields2 = fieldArray.getFields();
      expect(fields2).toHaveLength(1);
      expect(fields2.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);
    });
  });

  describe("#setValue", () => {
    it("sets the value of the field array", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ value: [42] }));

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      const newValue = [1, 2];
      fieldArray.setValue(newValue);
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ value: [1, 2] }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ value: [1, 2] }));

      // does nothing if the same value is already set
      fieldArray.setValue(newValue);
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ value: [1, 2] }));

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it("dispatches only once when called multiple times", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ value: [42] }));

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.setValue([1, 2]);
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ value: [1, 2] }));

      fieldArray.setValue([3]);
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ value: [3] }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ value: [3] }));
    });

    it("triggers validation", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });

      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => {});
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: [42] }));

      const newValue = [1, 2];
      fieldArray.setValue(newValue);
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ value: [1, 2] }));

      // does nothing if the same value is already set
      fieldArray.setValue(newValue);
      expect(validator).toHaveBeenCalledTimes(2);
    });

    it("recreates the child fields", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const fields1 = fieldArray.getFields();
      expect(fields1).toHaveLength(1);
      expect(fields1.map(field => field.getSnapshot())).toEqual([
        {
          defaultValue: 42,
          value: 42,
          isTouched: false,
          isDirty: false,
          errors: {},
          isPending: false,
        },
      ]);

      const subscriber = jest.fn(() => {});
      fieldArray.subscribeFields(subscriber);

      const newValue = [1, 2];
      fieldArray.setValue(newValue);
      const fields2 = fieldArray.getFields();
      expect(fields2).toHaveLength(2);
      expect(fields2[0].id).not.toBe(fields1[0].id);
      expect(fields2[1].id).not.toBe(fields1[0].id);
      expect(fields2.map(field => field.getSnapshot())).toEqual([
        {
          defaultValue: 1,
          value: 1,
          isTouched: false,
          isDirty: false,
          errors: {},
          isPending: false,
        },
        {
          defaultValue: 2,
          value: 2,
          isTouched: false,
          isDirty: false,
          errors: {},
          isPending: false,
        },
      ]);
      // old fields are not updated
      expect(fields1.map(field => field.getSnapshot())).toEqual([
        {
          defaultValue: 42,
          value: 42,
          isTouched: false,
          isDirty: false,
          errors: {},
          isPending: false,
        },
      ]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(fields2);

      // does nothing if the same value is already set
      fieldArray.setValue(newValue);
      const fields3 = fieldArray.getFields();
      expect(fields3).toHaveLength(2);
      expect(fields3[0].id).toBe(fields2[0].id);
      expect(fields3[1].id).toBe(fields2[1].id);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("#setTouched", () => {
    it("sets the field array touched", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ isTouched: false }));

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.setTouched();
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ isTouched: true }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ isTouched: true }));

      // does nothing if the field array is already touched
      fieldArray.setTouched();
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ isTouched: true }));
      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("#setDirty", () => {
    it("sets the field array dirty", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ isDirty: false }));

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.setDirty();
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ isDirty: true }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ isDirty: true }));

      // does nothing if the field array is already dirty
      fieldArray.setDirty();
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ isDirty: true }));
      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("#setCustomErrors", () => {
    it("sets custom errors of the field array", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: false } }));

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.setCustomErrors({ foo: true, bar: false });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true, bar: false } })
      );

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, foo: true, bar: false } })
      );

      // does nothing if the field array has the same errors
      fieldArray.setCustomErrors({ foo: true, bar: false });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true, bar: false } })
      );

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it("overrides validation errors", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const validator: Validator<readonly number[]> = ({ resolve }) => {
        resolve(true);
      };
      fieldArray.addValidator("foo", validator);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true } })
      );

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.setCustomErrors({ foo: false });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: false } })
      );

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, foo: false } })
      );

      // removing custom errors uncovers the validation errors
      fieldArray.setCustomErrors({});
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true } })
      );

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, foo: true } })
      );
    });

    it("overrides children errors", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: false } }));

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.setCustomErrors({ 0: true });
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: true } }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ errors: { 0: true } }));

      // removing custom errors uncovers the children errors
      fieldArray.setCustomErrors({});
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: false } }));

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false } })
      );
    });
  });

  describe("reset", () => {
    it("resets the field array's state", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      fieldArray.setValue([1, 2]);
      fieldArray.setTouched();
      fieldArray.setDirty();
      fieldArray.setCustomErrors({ foo: true });
      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => {});
      fieldArray.addValidator("bar", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: [1, 2] }));
      request1.resolve(true);
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [1, 2],
        isTouched: true,
        isDirty: true,
        errors: { 0: false, 1: false, foo: true, bar: true },
        isPending: false,
      });

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.reset();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ value: [0] }));
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isTouched: false,
        isDirty: false,
        errors: { 0: false },
        isPending: true,
      });

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith({
        defaultValue: [0],
        value: [0],
        isTouched: false,
        isDirty: false,
        errors: { 0: false },
        isPending: true,
      });

      request2.resolve(false);
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isTouched: false,
        isDirty: false,
        errors: { 0: false, bar: false },
        isPending: false,
      });

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith({
        defaultValue: [0],
        value: [0],
        isTouched: false,
        isDirty: false,
        errors: { 0: false, bar: false },
        isPending: false,
      });
    });

    it("triggers validation even if the value is already default", () => {
      const defaultValue = [0];
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue,
        value: defaultValue,
      });
      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => {});
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: [0] }));
      request1.resolve(true);
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isTouched: false,
        isDirty: false,
        errors: { 0: false, foo: true },
        isPending: false,
      });

      fieldArray.reset();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ value: [0] }));
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isTouched: false,
        isDirty: false,
        errors: { 0: false },
        isPending: true,
      });

      request2.resolve(false);
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isTouched: false,
        isDirty: false,
        errors: { 0: false, foo: false },
        isPending: false,
      });
    });

    it("accepts immediate validation errors after resetting", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      fieldArray.setValue([1, 2]);
      fieldArray.setTouched();
      fieldArray.setDirty();
      fieldArray.setCustomErrors({ foo: true });
      const validator: Validator<readonly number[]> = ({ resolve }) => {
        resolve(true);
      };
      fieldArray.addValidator("bar", validator);
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [1, 2],
        isTouched: true,
        isDirty: true,
        errors: { 0: false, 1: false, foo: true, bar: true },
        isPending: false,
      });

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.reset();
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isTouched: false,
        isDirty: false,
        errors: { 0: false, bar: true },
        isPending: false,
      });
    });

    it("recreates the child fields", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const fields1 = fieldArray.getFields();
      expect(fields1).toHaveLength(1);
      const field1 = fields1[0];
      field1.setValue(1);
      field1.setTouched();
      field1.setDirty();
      field1.setCustomErrors({ foo: true });
      const validator = jest.fn((_: ValidationRequest<number>) => {});
      field1.addValidator("bar", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: 1 }));
      request1.resolve({});
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [1],
        isTouched: true,
        isDirty: true,
        errors: { 0: true },
        isPending: false,
      });
      expect(field1.getSnapshot()).toEqual({
        defaultValue: 42,
        value: 1,
        isTouched: true,
        isDirty: true,
        errors: { foo: true, bar: {} },
        isPending: false,
      });

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.reset();
      expect(validator).toHaveBeenCalledTimes(1);
      const fields2 = fieldArray.getFields();
      expect(fields2).toHaveLength(1);
      const field2 = fields2[0];
      expect(field2.id).not.toBe(field1.id);
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isTouched: false,
        isDirty: false,
        errors: { 0: false },
        isPending: false,
      });
      expect(field2.getSnapshot()).toEqual({
        defaultValue: 0,
        value: 0,
        isTouched: false,
        isDirty: false,
        errors: {},
        isPending: false,
      });
    });

    it("does not recreate the child fields if the value is already default", () => {
      const defalutValue = [0];
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: defalutValue,
        value: defalutValue,
      });
      const fields = fieldArray.getFields();
      expect(fields).toHaveLength(1);
      const field = fields[0];
      field.setTouched();
      field.setDirty();
      field.setCustomErrors({ foo: true });
      const validator = jest.fn((_: ValidationRequest<number>) => {});
      field.addValidator("bar", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: 0 }));
      request1.resolve({});
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isTouched: true,
        isDirty: true,
        errors: { 0: true },
        isPending: false,
      });
      expect(field.getSnapshot()).toEqual({
        defaultValue: 0,
        value: 0,
        isTouched: true,
        isDirty: true,
        errors: { foo: true, bar: {} },
        isPending: false,
      });

      fieldArray.reset();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ value: 0 }));
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isTouched: false,
        isDirty: false,
        errors: { 0: false },
        isPending: true,
      });
      expect(field.getSnapshot()).toEqual({
        defaultValue: 0,
        value: 0,
        isTouched: false,
        isDirty: false,
        errors: {},
        isPending: true,
      });

      request2.resolve(null);
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isTouched: false,
        isDirty: false,
        errors: { 0: false },
        isPending: false,
      });
      expect(field.getSnapshot()).toEqual({
        defaultValue: 0,
        value: 0,
        isTouched: false,
        isDirty: false,
        errors: { bar: null },
        isPending: false,
      });
    });
  });

  describe("#addValidator", () => {
    it("attaches a validator to the field array", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => {});
      const removeValidator = fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: [42],
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      request1.resolve(true);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      // creates a new validation request when 'value' is changed
      fieldArray.setValue([1, 2]);
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: [1, 2],
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(request2.id).not.toBe(request1.id);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: true }, isPending: true })
      );

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: true }, isPending: true })
      );

      request2.resolve(false);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: false }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(3);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(4);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: false }, isPending: false })
      );

      // can remove
      removeValidator();
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(4);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(5);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, 1: false }, isPending: false })
      );
    });

    it("aborts the pending validation request when a new request is created", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => {});
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: [42] }));
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      const onAbort = jest.fn(() => {});
      request1.signal.addEventListener("abort", onAbort);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      expect(onAbort).toHaveBeenCalledTimes(0);

      // creates a new validation request when 'value' is changed
      fieldArray.setValue([1, 2]);
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ value: [1, 2] }));
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false }, isPending: true })
      );
      expect(onAbort).toHaveBeenCalledTimes(1);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, 1: false }, isPending: true })
      );

      request2.resolve(false);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: false }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: false }, isPending: false })
      );

      // resolving an aborted request has no effect
      request1.resolve(true);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: false }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(3);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
    });

    it("overrides children errors", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const fields = fieldArray.getFields();
      expect(fields).toHaveLength(1);
      const field = fields[0];
      field.setCustomErrors({ foo: true });
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: true } }));

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      const validator: Validator<readonly number[]> = ({ resolve }) => {
        resolve(false);
      };
      const removeValidator = fieldArray.addValidator("0", validator);
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: false } }));

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false } })
      );

      // removing the validator uncovers the children errors
      removeValidator();
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: true } }));

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ errors: { 0: true } }));
    });

    it("throws error if the field array already has a validator with the same key", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });

      fieldArray.addValidator("foo", () => {});

      expect(() => {
        fieldArray.addValidator("foo", () => {});
      }).toThrowError("FieldArray '$root' already has a validator 'foo'");
    });
  });

  describe("#removeValidator", () => {
    it("removes a validator and cleans up the error", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => {});
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request = validator.mock.calls[0][0];
      expect(request).toEqual(expect.objectContaining({ value: [42] }));
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      request.resolve(true);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      fieldArray.removeValidator("foo", validator);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );
    });

    it("cleans up the pending validation request", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => {});
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request = validator.mock.calls[0][0];
      expect(request).toEqual(expect.objectContaining({ value: [42] }));
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      const onAbort = jest.fn(() => {});
      request.signal.addEventListener("abort", onAbort);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      expect(onAbort).toHaveBeenCalledTimes(0);
      fieldArray.removeValidator("foo", validator);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );
      expect(onAbort).toHaveBeenCalledTimes(1);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      // resolving an aborted request has no effect
      request.resolve(true);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it("does nothing when a validator is removed twice", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: false } }));

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      const validator: Validator<readonly number[]> = ({ resolve }) => {
        resolve(true);
      };
      fieldArray.addValidator("foo", validator);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true } })
      );

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, foo: true } })
      );

      fieldArray.removeValidator("foo", validator);
      expect(fieldArray.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: false } }));

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false } })
      );

      fieldArray.addValidator("foo", ({ resolve }) => {
        resolve(false);
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: false } })
      );

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, foo: false } })
      );

      fieldArray.removeValidator("foo", validator);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: false } })
      );

      expect(subscriber).toHaveBeenCalledTimes(3);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(3);
    });
  });

  describe("#validate", () => {
    it("triggers validation", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => {});
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: [42],
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      request1.resolve(true);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      fieldArray.validate();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: [42],
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(request2.id).not.toBe(request1.id);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: true })
      );

      request2.resolve(false);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: false }, isPending: false })
      );
    });

    it("triggers validation of the child fields", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const fields = fieldArray.getFields();
      expect(fields).toHaveLength(1);
      const field = fields[0];
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );
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
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      request1.resolve({});
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: true }, isPending: false })
      );
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: {} }, isPending: false })
      );

      fieldArray.validate();
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
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: true }, isPending: true })
      );
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: {} }, isPending: true })
      );

      request2.resolve(null);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: null }, isPending: false })
      );
    });
  });

  describe("#validateOnce", () => {
    it("runs attached validators and returns the value and errors", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => {});
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: false,
        value: [42],
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      request1.resolve(true);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      const promise = fieldArray.validateOnce();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: true,
        value: [42],
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(request2.id).not.toBe(request1.id);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      fieldArray.setValue([1, 2]);
      expect(validator).toHaveBeenCalledTimes(3);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: true }, isPending: true })
      );

      request2.resolve(false);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: true }, isPending: true })
      );

      // the value at the time when 'validateOnce' is called is used
      await expect(promise).resolves.toEqual({
        value: [42],
        errors: { 0: false, foo: false },
      });
    });

    it("includes custom errors in the result", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => {});
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ onetime: false, value: [42] }));
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      request1.resolve(true);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      fieldArray.setCustomErrors({ foo: true, bar: true });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true, bar: true }, isPending: false })
      );

      const promise = fieldArray.validateOnce();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ onetime: true, value: [42] }));
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true, bar: true }, isPending: false })
      );

      request2.resolve(false);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true, bar: true }, isPending: false })
      );

      fieldArray.setCustomErrors({ foo: false, bar: false });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: false, bar: false }, isPending: false })
      );

      // the custom errors at the time when 'validateOnce' is called is used
      // custom errors override validation errors
      await expect(promise).resolves.toEqual({
        value: [42],
        errors: { 0: false, foo: true, bar: true },
      });
    });

    it("is aborted when the signal is aborted", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => {});
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ onetime: false, value: [42] }));
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      request1.resolve(true);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      const controller = new window.AbortController();
      const promise = fieldArray.validateOnce({ signal: controller.signal });
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ onetime: true, value: [42] }));
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      controller.abort();

      request2.resolve(false);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      await expect(promise).rejects.toThrowError("Aborted");
    });

    it("is aborted if the signal has already been aborted", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => {});
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ onetime: false, value: [42] }));
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      request1.resolve(true);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      const controller = new window.AbortController();
      controller.abort();
      const promise = fieldArray.validateOnce({ signal: controller.signal });
      expect(validator).toHaveBeenCalledTimes(1);

      await expect(promise).rejects.toThrowError("Aborted");
    });

    it("runs validators attached to the children with a given value and returns the errors", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const fields = fieldArray.getFields();
      expect(fields).toHaveLength(1);
      const field = fields[0];
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );
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
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      request1.resolve({});
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: true }, isPending: false })
      );
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: {} }, isPending: false })
      );

      const promise = fieldArray.validateOnce();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        onetime: true,
        value: 42,
        resolve: expect.any(Function),
        signal: expect.any(window.AbortSignal),
      });
      expect(request2.id).not.toBe(request1.id);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: true }, isPending: false })
      );
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: {} }, isPending: false })
      );

      fieldArray.setValue([1, 2]);
      expect(validator).toHaveBeenCalledTimes(2);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false }, isPending: false })
      );

      request2.resolve(null);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false }, isPending: false })
      );

      // the value at the time when 'validateOnce' is called is used
      await expect(promise).resolves.toEqual({
        value: [42],
        errors: { 0: false },
      });
    });
  });
});
