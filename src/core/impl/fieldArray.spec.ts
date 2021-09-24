import { triplet } from "@susisu/promise-utils";
import { waitForMicrotasks } from "../../__tests__/utils";
import { FieldNode, ValidationRequest, Validator } from "../field";
import { FieldArrayImpl } from "./fieldArray";
import { FieldNodeImpl } from "./fieldNode";

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
        isDirty: false,
        isTouched: false,
        errors: { 0: false },
        isPending: false,
      });

      // After the state updated, 'getSnapshot' immediately returns the latest state.
      fieldArray.setValue([1, 2]);
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [1, 2],
        isDirty: true,
        isTouched: false,
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

  describe("#flushDispatchQueue", () => {
    it("immediately dispatches the snapshot updates to the subscribers", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.setValue([1]);
      expect(subscriber).toHaveBeenCalledTimes(0);

      fieldArray.flushDispatchQueue();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ value: [1] }));

      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it("dispatches updates after flushing automatically", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.setValue([1]);
      expect(subscriber).toHaveBeenCalledTimes(0);

      fieldArray.flushDispatchQueue();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ value: [1] }));

      fieldArray.setValue([2]);
      expect(subscriber).toHaveBeenCalledTimes(1);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(expect.objectContaining({ value: [2] }));
    });

    it("does nothing if there are no updates", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      expect(subscriber).toHaveBeenCalledTimes(0);

      fieldArray.flushDispatchQueue();
      expect(subscriber).toHaveBeenCalledTimes(0);

      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);
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
          isDirty: false,
          isTouched: false,
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
          isDirty: false,
          isTouched: false,
          errors: {},
          isPending: false,
        },
        {
          defaultValue: 2,
          value: 2,
          isDirty: false,
          isTouched: false,
          errors: {},
          isPending: false,
        },
      ]);
    });

    it("accepts updates from the child fields", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42, 43],
      });
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [42, 43],
        isDirty: false,
        isTouched: false,
        errors: { 0: false, 1: false },
        isPending: false,
      });
      const fields1 = fieldArray.getFields();
      expect(fields1).toHaveLength(2);
      expect(fields1.map(field => field.getSnapshot())).toEqual([
        {
          defaultValue: 42,
          value: 42,
          isDirty: false,
          isTouched: false,
          errors: {},
          isPending: false,
        },
        {
          defaultValue: 43,
          value: 43,
          isDirty: false,
          isTouched: false,
          errors: {},
          isPending: false,
        },
      ]);

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fields1[0].setValue(1);
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [1, 43],
        isDirty: true,
        isTouched: false,
        errors: { 0: false, 1: false },
        isPending: false,
      });
      const fields2 = fieldArray.getFields();
      expect(fields2).toHaveLength(2);
      expect(fields2.map(field => field.getSnapshot())).toEqual([
        {
          defaultValue: 42,
          value: 1,
          isDirty: true,
          isTouched: false,
          errors: {},
          isPending: false,
        },
        {
          defaultValue: 43,
          value: 43,
          isDirty: false,
          isTouched: false,
          errors: {},
          isPending: false,
        },
      ]);
      expect(fields2[0].id).toBe(fields1[0].id);
      expect(fields2[1].id).toBe(fields1[1].id);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith({
        defaultValue: [0],
        value: [1, 43],
        isDirty: true,
        isTouched: false,
        errors: { 0: false, 1: false },
        isPending: false,
      });
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
          isDirty: false,
          isTouched: false,
          errors: {},
          isPending: false,
        },
        {
          defaultValue: 2,
          value: 2,
          isDirty: false,
          isTouched: false,
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
          isDirty: false,
          isTouched: false,
          errors: {},
          isPending: false,
        },
        {
          defaultValue: 2,
          value: 2,
          isDirty: false,
          isTouched: false,
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
    it("sets the value of the field array and flags the field array is dirty", async () => {
      const initialValue = [42];
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: initialValue,
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42], isDirty: false })
      );

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      // does nothing if the same value is already set
      fieldArray.setValue(initialValue);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42], isDirty: false })
      );

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);

      const newValue = [1, 2];
      fieldArray.setValue(newValue);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [1, 2], isDirty: true })
      );

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ value: [1, 2], isDirty: true })
      );

      // does nothing if the same value is already set
      fieldArray.setValue(newValue);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [1, 2], isDirty: true })
      );

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
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42], isDirty: false })
      );

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.setValue([1, 2]);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [1, 2], isDirty: true })
      );

      fieldArray.setValue([3]);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [3], isDirty: true })
      );

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ value: [3], isDirty: true })
      );
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
      fieldArray.addValidator("foo", () => true);
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

  describe("#reset", () => {
    it("resets the field array's state", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      fieldArray.setValue([1, 2]);
      fieldArray.setDirty();
      fieldArray.setTouched();
      fieldArray.setCustomErrors({ foo: true });
      let promise: Promise<unknown>;
      const [promise1, resolve1] = triplet<unknown>();
      promise = promise1;
      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => promise);
      fieldArray.addValidator("bar", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: [1, 2] }));
      resolve1(true);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [1, 2],
        isDirty: true,
        isTouched: true,
        errors: { 0: false, 1: false, foo: true, bar: true },
        isPending: false,
      });

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      const [promise2, resolve2] = triplet<unknown>();
      promise = promise2;

      fieldArray.reset();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ value: [0] }));
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isDirty: false,
        isTouched: false,
        errors: { 0: false },
        isPending: true,
      });

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith({
        defaultValue: [0],
        value: [0],
        isDirty: false,
        isTouched: false,
        errors: { 0: false },
        isPending: true,
      });

      resolve2(false);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isDirty: false,
        isTouched: false,
        errors: { 0: false, bar: false },
        isPending: false,
      });
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith({
        defaultValue: [0],
        value: [0],
        isDirty: false,
        isTouched: false,
        errors: { 0: false, bar: false },
        isPending: false,
      });
    });

    it("triggers validation even if the value is already default", async () => {
      const defaultValue = [0];
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue,
        value: defaultValue,
      });
      let promise: Promise<unknown>;
      const [promise1, resolve1] = triplet<unknown>();
      promise = promise1;
      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => promise);
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: [0] }));
      resolve1(true);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isDirty: false,
        isTouched: false,
        errors: { 0: false, foo: true },
        isPending: false,
      });

      const [promise2, resolve2] = triplet<unknown>();
      promise = promise2;

      fieldArray.reset();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ value: [0] }));
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isDirty: false,
        isTouched: false,
        errors: { 0: false },
        isPending: true,
      });

      resolve2(false);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isDirty: false,
        isTouched: false,
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
      fieldArray.setDirty();
      fieldArray.setTouched();
      fieldArray.setCustomErrors({ foo: true });
      fieldArray.addValidator("bar", () => true);
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [1, 2],
        isDirty: true,
        isTouched: true,
        errors: { 0: false, 1: false, foo: true, bar: true },
        isPending: false,
      });

      const subscriber = jest.fn(() => {});
      fieldArray.subscribe(subscriber);

      fieldArray.reset();
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isDirty: false,
        isTouched: false,
        errors: { 0: false, bar: true },
        isPending: false,
      });
    });

    it("recreates the child fields", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const fields1 = fieldArray.getFields();
      expect(fields1).toHaveLength(1);
      const field1 = fields1[0];
      field1.setValue(1);
      field1.setDirty();
      field1.setTouched();
      field1.setCustomErrors({ foo: true });
      const [promise, resolve] = triplet<unknown>();
      const validator = jest.fn((_: ValidationRequest<number>) => promise);
      field1.addValidator("bar", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request = validator.mock.calls[0][0];
      expect(request).toEqual(expect.objectContaining({ value: 1 }));
      resolve({});
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [1],
        isDirty: true,
        isTouched: true,
        errors: { 0: true },
        isPending: false,
      });
      expect(field1.getSnapshot()).toEqual({
        defaultValue: 42,
        value: 1,
        isDirty: true,
        isTouched: true,
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
        isDirty: false,
        isTouched: false,
        errors: { 0: false },
        isPending: false,
      });
      expect(field2.getSnapshot()).toEqual({
        defaultValue: 0,
        value: 0,
        isDirty: false,
        isTouched: false,
        errors: {},
        isPending: false,
      });
    });

    it("does not recreate the child fields if the value is already default", async () => {
      const defalutValue = [0];
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: defalutValue,
        value: defalutValue,
      });
      const fields = fieldArray.getFields();
      expect(fields).toHaveLength(1);
      const field = fields[0];
      field.setDirty();
      field.setTouched();
      field.setCustomErrors({ foo: true });
      let promise: Promise<unknown>;
      const [promise1, resolve1] = triplet<unknown>();
      promise = promise1;
      const validator = jest.fn((_: ValidationRequest<number>) => promise);
      field.addValidator("bar", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual(expect.objectContaining({ value: 0 }));
      resolve1({});
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isDirty: true,
        isTouched: true,
        errors: { 0: true },
        isPending: false,
      });
      expect(field.getSnapshot()).toEqual({
        defaultValue: 0,
        value: 0,
        isDirty: true,
        isTouched: true,
        errors: { foo: true, bar: {} },
        isPending: false,
      });

      const [promise2, resolve2] = triplet<unknown>();
      promise = promise2;

      fieldArray.reset();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ value: 0 }));
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isDirty: false,
        isTouched: false,
        errors: { 0: false },
        isPending: true,
      });
      expect(field.getSnapshot()).toEqual({
        defaultValue: 0,
        value: 0,
        isDirty: false,
        isTouched: false,
        errors: {},
        isPending: true,
      });

      resolve2(null);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual({
        defaultValue: [0],
        value: [0],
        isDirty: false,
        isTouched: false,
        errors: { 0: false },
        isPending: false,
      });
      expect(field.getSnapshot()).toEqual({
        defaultValue: 0,
        value: 0,
        isDirty: false,
        isTouched: false,
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

      let promise: Promise<unknown>;
      const [promise1, resolve1] = triplet<unknown>();
      promise = promise1;
      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => promise);
      const removeValidator = fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        value: [42],
        signal: expect.any(AbortSignal),
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

      resolve1(true);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      const [promise2, resolve2] = triplet<unknown>();
      promise = promise2;

      // creates a new validation request when 'value' is changed
      fieldArray.setValue([1, 2]);
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        value: [1, 2],
        signal: expect.any(AbortSignal),
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

      resolve2(false);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: false }, isPending: false })
      );
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

      let promise: Promise<unknown>;
      const [promise1, resolve1] = triplet<unknown>();
      promise = promise1;
      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => promise);
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

      const [promise2, resolve2] = triplet<unknown>();
      promise = promise2;

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

      resolve2(false);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: false }, isPending: false })
      );
      expect(subscriber).toHaveBeenCalledTimes(3);
      expect(subscriber).toHaveBeenLastCalledWith(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: false }, isPending: false })
      );

      // resolving an aborted request has no effect
      resolve1(true);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, 1: false, foo: false }, isPending: false })
      );
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

      const removeValidator = fieldArray.addValidator("0", () => false);
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

    it("logs error to the console if the validation is rejected", async () => {
      const spy = jest.spyOn(console, "error");
      spy.mockImplementation(() => {});

      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      const [promise, , reject] = triplet<unknown>();
      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => promise);
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request = validator.mock.calls[0][0];
      expect(request).toEqual(expect.objectContaining({ value: [42] }));
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      const err = new Error("unexpected error");
      reject(err);
      await waitForMicrotasks();
      expect(spy).toHaveBeenLastCalledWith(err);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      spy.mockRestore();
    });

    it("ignores error if the validation is rejected but already aborted", async () => {
      const spy = jest.spyOn(console, "error");
      spy.mockImplementation(() => {});

      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      let promise: Promise<unknown>;
      const [promise1, , reject1] = triplet<unknown>();
      promise = promise1;
      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => promise);
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request = validator.mock.calls[0][0];
      expect(request).toEqual(expect.objectContaining({ value: [42] }));
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      const [promise2] = triplet<unknown>();
      promise = promise2;

      fieldArray.setValue([1]);
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual(expect.objectContaining({ value: [1] }));

      const err = new Error("unexpected error");
      reject1(err);
      await waitForMicrotasks();
      expect(spy).not.toHaveBeenCalledWith(err);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      spy.mockRestore();
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

      const [promise, resolve] = triplet<unknown>();
      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => promise);
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

      resolve(true);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );
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

      const [promise, resolve] = triplet<unknown>();
      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => promise);
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
      resolve(true);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );
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

      const validator: Validator<readonly number[]> = () => true;
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

      fieldArray.addValidator("foo", () => false);
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
    it("triggers validation", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      let promise: Promise<unknown>;
      const [promise1, resolve1] = triplet<unknown>();
      promise = promise1;
      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => promise);
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        value: [42],
        signal: expect.any(AbortSignal),
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      resolve1(true);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );

      const [promise2, resolve2] = triplet<unknown>();
      promise = promise2;

      fieldArray.validate();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        value: [42],
        signal: expect.any(AbortSignal),
      });
      expect(request2.id).not.toBe(request1.id);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: true })
      );

      resolve2(false);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: false }, isPending: false })
      );
    });

    it("triggers validation of the child fields", async () => {
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

      let promise: Promise<unknown>;
      const [promise1, resolve1] = triplet<unknown>();
      promise = promise1;
      const validator = jest.fn((_: ValidationRequest<number>) => promise);
      field.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      const request1 = validator.mock.calls[0][0];
      expect(request1).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        value: 42,
        signal: expect.any(AbortSignal),
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );
      expect(field.getSnapshot()).toEqual(expect.objectContaining({ errors: {}, isPending: true }));

      resolve1({});
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: true }, isPending: false })
      );
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: {} }, isPending: false })
      );

      const [promise2, resolve2] = triplet<unknown>();
      promise = promise2;

      fieldArray.validate();
      expect(validator).toHaveBeenCalledTimes(2);
      const request2 = validator.mock.calls[1][0];
      expect(request2).toEqual({
        id: expect.stringMatching(/^ValidationRequest\//),
        value: 42,
        signal: expect.any(AbortSignal),
      });
      expect(request2.id).not.toBe(request1.id);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: true }, isPending: true })
      );
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: {} }, isPending: true })
      );

      resolve2(null);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );
      expect(field.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { foo: null }, isPending: false })
      );
    });
  });

  describe("#waitForValidation", () => {
    it("returns a promise which will be resolved after all pending validations are settled", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: false })
      );

      let done1 = false;
      fieldArray.waitForValidation().then(() => {
        done1 = true;
      });
      // settled immediately
      await waitForMicrotasks();
      expect(done1).toBe(true);

      const [promise, resolve] = triplet<unknown>();
      const validator = jest.fn((_: ValidationRequest<readonly number[]>) => promise);
      fieldArray.addValidator("foo", validator);
      expect(validator).toHaveBeenCalledTimes(1);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false }, isPending: true })
      );

      let done2 = false;
      fieldArray.waitForValidation().then(() => {
        done2 = true;
      });
      // not settled yet
      await waitForMicrotasks();
      expect(done2).toBe(false);

      resolve(true);
      await waitForMicrotasks();
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: true }, isPending: false })
      );
      expect(done2).toBe(true);
    });
  });

  describe("#connect", () => {
    it("throws error if the field array has no parent", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(() => {
        fieldArray.connect();
      }).toThrowError("FieldArray '$root' has no parent");
    });

    it("throws error if the field array is already connected", () => {
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: [1] },
        value: { x: [42], y: [43] },
      });
      const child = parent.createChildArray("x");
      child.connect();
      expect(() => {
        child.connect();
      }).toThrowError("FieldArray '$root.x' is already connected");
    });

    it("throws error when trying to connect two children for the same key", () => {
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: [1] },
        value: { x: [42], y: [43] },
      });
      const child1 = parent.createChildArray("x");
      const child2 = parent.createChildArray("x");
      child1.connect();
      expect(() => {
        child2.connect();
      }).toThrowError("FieldNode '$root' already has a child 'x'");
    });

    it("synchronizes a child with the parent only if they are connected", () => {
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: 1 },
        value: { x: [42], y: 43 },
      });
      const child = parent.createChildArray("x");
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [42], y: 43 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [42] }));

      parent.setValue({ x: [2], y: 3 });
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [2], y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [42] }));

      child.setValue([4]);
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [2], y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [4] }));

      // sync
      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [2], y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [2] }));

      parent.setValue({ x: [5], y: 6 });
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [5], y: 6 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [5] }));

      child.setValue([7]);
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [7], y: 6 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [7] }));

      // unsync
      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [7], y: 6 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [7] }));

      parent.setValue({ x: [8], y: 9 });
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [8], y: 9 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [7] }));

      child.setValue([10]);
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [8], y: 9 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [10] }));

      // resync
      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [8], y: 9 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [8] }));
    });

    it("synchronizes the default value of a child with the parent", () => {
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: 1 },
        value: { x: [42], y: 43 },
      });
      const child = parent.createChildArray("x");
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ defaultValue: { x: [0], y: 1 } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: [0] }));

      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ defaultValue: { x: [0], y: 1 } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: [0] }));

      parent.setDefaultValue({ x: [2], y: 3 });
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ defaultValue: { x: [2], y: 3 } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: [2] }));

      child.setDefaultValue([4]);
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ defaultValue: { x: [4], y: 3 } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: [4] }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ defaultValue: { x: [4], y: 3 } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: [4] }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ defaultValue: { x: [4], y: 3 } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ defaultValue: [4] }));
    });

    it("synchronizes the value of a child with the parent", () => {
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: 1 },
        value: { x: [42], y: 43 },
      });
      const child = parent.createChildArray("x");
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [42], y: 43 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [42] }));

      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [42], y: 43 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [42] }));

      parent.setValue({ x: [2], y: 3 });
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [2], y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [2] }));

      child.setValue([4]);
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [4], y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [4] }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [4], y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [4] }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [4], y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [4] }));
    });

    it("synchronizes the dirty state from a child to the parent", () => {
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: 1 },
        value: { x: [42], y: 43 },
      });
      const child = parent.createChildArray("x");
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
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: 1 },
        value: { x: [42], y: 43 },
      });
      const child = parent.createChildArray("x");
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

    it("synchronizes the touched state from a child to the parent", () => {
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: 1 },
        value: { x: [42], y: 43 },
      });
      const child = parent.createChildArray("x");
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
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: 1 },
        value: { x: [42], y: 43 },
      });
      const child = parent.createChildArray("x");
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

    it("synchronizes the errors from a child to the parent", () => {
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: 1 },
        value: { x: [42], y: 43 },
      });
      const child = parent.createChildArray("x");
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: false } }));

      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: { x: false } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: false } }));

      child.setCustomErrors({ foo: {} });
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: { x: true } }));
      expect(child.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: {} } })
      );

      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: {} }));
      expect(child.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: {} } })
      );

      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: { x: true } }));
      expect(child.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { 0: false, foo: {} } })
      );
    });

    it("does not synchronize the errors from the parent to a child", () => {
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: 1 },
        value: { x: [42], y: 43 },
      });
      const child = parent.createChildArray("x");
      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: { x: false } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: false } }));

      parent.setCustomErrors({ foo: {} });
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: false, foo: {} } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: false } }));

      disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ errors: { foo: {} } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: false } }));

      child.connect();
      expect(parent.getSnapshot()).toEqual(
        expect.objectContaining({ errors: { x: false, foo: {} } })
      );
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ errors: { 0: false } }));
    });

    it("synchronizes the pending state from a child to the parent", () => {
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: 1 },
        value: { x: [42], y: 43 },
      });
      const child = parent.createChildArray("x");
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isPending: false }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isPending: false }));

      const disconnect = child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ isPending: false }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ isPending: false }));

      child.addValidator("foo", () => new Promise(() => {}));
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
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: 1 },
        value: { x: [42], y: 43 },
      });
      const child = parent.createChildArray("x");
      const disconnect = child.connect();
      parent.addValidator("foo", () => new Promise(() => {}));
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

  describe("#disconnect", () => {
    it("throws error if the field array has no parent", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(() => {
        fieldArray.disconnect();
      }).toThrowError("FieldArray '$root' has no parent");
    });

    it("unsynchronizes a child with the parent", () => {
      const parent = new FieldNodeImpl({
        path: "$root",
        defaultValue: { x: [0], y: 1 },
        value: { x: [42], y: 43 },
      });
      const child = parent.createChildArray("x");
      child.connect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [42], y: 43 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [42] }));

      parent.setValue({ x: [2], y: 3 });
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [2], y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [2] }));

      child.setValue([4]);
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [4], y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [4] }));

      // unsync
      child.disconnect();
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [4], y: 3 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [4] }));

      parent.setValue({ x: [5], y: 6 });
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [5], y: 6 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [4] }));

      child.setValue([7]);
      expect(parent.getSnapshot()).toEqual(expect.objectContaining({ value: { x: [5], y: 6 } }));
      expect(child.getSnapshot()).toEqual(expect.objectContaining({ value: [7] }));
    });
  });

  describe("#append", () => {
    it("appends a field at the last of the array", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42], errors: { 0: false } })
      );
      const fields1 = fieldArray.getFields();
      expect(fields1).toHaveLength(1);
      expect(fields1.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
      ]);

      const subscriber = jest.fn(() => {});
      fieldArray.subscribeFields(subscriber);

      fieldArray.append(1);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 1], errors: { 0: false, 1: false } })
      );
      const fields2 = fieldArray.getFields();
      expect(fields2).toHaveLength(2);
      expect(fields2[0].id).toBe(fields1[0].id);
      expect(fields2.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 1, value: 1 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(fields2);

      fields2[1].setValue(2);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 2], errors: { 0: false, 1: false } })
      );
      const fields3 = fieldArray.getFields();
      expect(fields3).toHaveLength(2);
      expect(fields3[0].id).toBe(fields2[0].id);
      expect(fields3[1].id).toBe(fields2[1].id);
      expect(fields3.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 1, value: 2 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("#prepend", () => {
    it("prepends a field at the head of the array", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42], errors: { 0: false } })
      );
      const fields1 = fieldArray.getFields();
      expect(fields1).toHaveLength(1);
      expect(fields1.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
      ]);

      const subscriber = jest.fn(() => {});
      fieldArray.subscribeFields(subscriber);

      fieldArray.prepend(1);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [1, 42], errors: { 0: false, 1: false } })
      );
      const fields2 = fieldArray.getFields();
      expect(fields2).toHaveLength(2);
      expect(fields2[1].id).toBe(fields1[0].id);
      expect(fields2.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 1, value: 1 }),
        expect.objectContaining({ defaultValue: 42, value: 42 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(fields2);

      fields2[0].setValue(2);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [2, 42], errors: { 0: false, 1: false } })
      );
      const fields3 = fieldArray.getFields();
      expect(fields3).toHaveLength(2);
      expect(fields3[0].id).toBe(fields2[0].id);
      expect(fields3[1].id).toBe(fields2[1].id);
      expect(fields3.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 1, value: 2 }),
        expect.objectContaining({ defaultValue: 42, value: 42 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe("#insert", () => {
    it("inserts a field at the specified index of the array", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42, 43],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 43], errors: { 0: false, 1: false } })
      );
      const fields1 = fieldArray.getFields();
      expect(fields1).toHaveLength(2);
      expect(fields1.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
      ]);

      const subscriber = jest.fn(() => {});
      fieldArray.subscribeFields(subscriber);

      fieldArray.insert(1, 1);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 1, 43], errors: { 0: false, 1: false, 2: false } })
      );
      const fields2 = fieldArray.getFields();
      expect(fields2).toHaveLength(3);
      expect(fields2[0].id).toBe(fields1[0].id);
      expect(fields2[2].id).toBe(fields1[1].id);
      expect(fields2.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 1, value: 1 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(fields2);

      fields2[1].setValue(2);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 2, 43], errors: { 0: false, 1: false, 2: false } })
      );
      const fields3 = fieldArray.getFields();
      expect(fields3).toHaveLength(3);
      expect(fields3[0].id).toBe(fields2[0].id);
      expect(fields3[1].id).toBe(fields2[1].id);
      expect(fields3[2].id).toBe(fields2[2].id);
      expect(fields3.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 1, value: 2 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it("throws error if the index is out of range", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(() => {
        fieldArray.insert(-1, 1);
      }).toThrowError("FieldArray '$root' failed to insert: index '-1' is out of range");
      expect(() => {
        fieldArray.insert(2, 1);
      }).toThrowError("FieldArray '$root' failed to insert: index '2' is out of range");
    });
  });

  describe("#remove", () => {
    it("removes a field at the specified index of the array", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42, 43, 44],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 43, 44], errors: { 0: false, 1: false, 2: false } })
      );
      const fields1 = fieldArray.getFields();
      expect(fields1).toHaveLength(3);
      expect(fields1.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
      ]);

      const subscriber = jest.fn(() => {});
      fieldArray.subscribeFields(subscriber);

      fieldArray.remove(1);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 44], errors: { 0: false, 1: false } })
      );
      const fields2 = fieldArray.getFields();
      expect(fields2).toHaveLength(2);
      expect(fields2[0].id).toBe(fields1[0].id);
      expect(fields2[1].id).toBe(fields1[2].id);
      expect(fields2.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(fields2);

      fields2[1].setValue(1);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 1], errors: { 0: false, 1: false } })
      );
      const fields3 = fieldArray.getFields();
      expect(fields3).toHaveLength(2);
      expect(fields3[0].id).toBe(fields2[0].id);
      expect(fields3[1].id).toBe(fields2[1].id);
      expect(fields3.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 44, value: 1 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it("throws error if the index is out of range", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(() => {
        fieldArray.remove(-1);
      }).toThrowError("FieldArray '$root' failed to remove: index '-1' is out of range");
      expect(() => {
        fieldArray.remove(2);
      }).toThrowError("FieldArray '$root' failed to remove: index '2' is out of range");
    });
  });

  describe("#move", () => {
    it("moves a field to the specified index of the array", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42, 43, 44, 45, 46],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 43, 44, 45, 46] })
      );
      const fields1 = fieldArray.getFields();
      expect(fields1).toHaveLength(5);
      expect(fields1.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
        expect.objectContaining({ defaultValue: 45, value: 45 }),
        expect.objectContaining({ defaultValue: 46, value: 46 }),
      ]);

      const subscriber = jest.fn(() => {});
      fieldArray.subscribeFields(subscriber);

      // move to the same index = do nothing
      fieldArray.move(2, 2);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 43, 44, 45, 46] })
      );
      const fields2 = fieldArray.getFields();
      expect(fields2).toHaveLength(5);
      expect(fields2[0].id).toBe(fields1[0].id);
      expect(fields2[1].id).toBe(fields1[1].id);
      expect(fields2[2].id).toBe(fields1[2].id);
      expect(fields2[3].id).toBe(fields1[3].id);
      expect(fields2[4].id).toBe(fields1[4].id);
      expect(fields2.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
        expect.objectContaining({ defaultValue: 45, value: 45 }),
        expect.objectContaining({ defaultValue: 46, value: 46 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);

      // move forward
      fieldArray.move(1, 3);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 44, 45, 43, 46] })
      );
      const fields3 = fieldArray.getFields();
      expect(fields3).toHaveLength(5);
      expect(fields3[0].id).toBe(fields2[0].id);
      expect(fields3[1].id).toBe(fields2[2].id);
      expect(fields3[2].id).toBe(fields2[3].id);
      expect(fields3[3].id).toBe(fields2[1].id);
      expect(fields3[4].id).toBe(fields2[4].id);
      expect(fields3.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
        expect.objectContaining({ defaultValue: 45, value: 45 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
        expect.objectContaining({ defaultValue: 46, value: 46 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(fields3);

      fields3[2].setValue(1);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 44, 1, 43, 46] })
      );
      const fields4 = fieldArray.getFields();
      expect(fields4).toHaveLength(5);
      expect(fields4[0].id).toBe(fields3[0].id);
      expect(fields4[1].id).toBe(fields3[1].id);
      expect(fields4[2].id).toBe(fields3[2].id);
      expect(fields4[3].id).toBe(fields3[3].id);
      expect(fields4[4].id).toBe(fields3[4].id);
      expect(fields4.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
        expect.objectContaining({ defaultValue: 45, value: 1 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
        expect.objectContaining({ defaultValue: 46, value: 46 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);

      // move backward
      fieldArray.move(3, 1);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 43, 44, 1, 46] })
      );
      const fields5 = fieldArray.getFields();
      expect(fields5).toHaveLength(5);
      expect(fields5[0].id).toBe(fields4[0].id);
      expect(fields5[1].id).toBe(fields4[3].id);
      expect(fields5[2].id).toBe(fields4[1].id);
      expect(fields5[3].id).toBe(fields4[2].id);
      expect(fields5[4].id).toBe(fields4[4].id);
      expect(fields5.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
        expect.objectContaining({ defaultValue: 45, value: 1 }),
        expect.objectContaining({ defaultValue: 46, value: 46 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(fields5);

      fields5[2].setValue(2);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 43, 2, 1, 46] })
      );
      const fields6 = fieldArray.getFields();
      expect(fields6).toHaveLength(5);
      expect(fields6[0].id).toBe(fields5[0].id);
      expect(fields6[1].id).toBe(fields5[1].id);
      expect(fields6[2].id).toBe(fields5[2].id);
      expect(fields6[3].id).toBe(fields5[3].id);
      expect(fields6[4].id).toBe(fields5[4].id);
      expect(fields6.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
        expect.objectContaining({ defaultValue: 44, value: 2 }),
        expect.objectContaining({ defaultValue: 45, value: 1 }),
        expect.objectContaining({ defaultValue: 46, value: 46 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it("throws error if the index is out of range", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(() => {
        fieldArray.move(-1, 0);
      }).toThrowError("FieldArray '$root' failed to move: fromIndex '-1' is out of range");
      expect(() => {
        fieldArray.move(1, 0);
      }).toThrowError("FieldArray '$root' failed to move: fromIndex '1' is out of range");
      expect(() => {
        fieldArray.move(0, -1);
      }).toThrowError("FieldArray '$root' failed to move: toIndex '-1' is out of range");
      expect(() => {
        fieldArray.move(0, 1);
      }).toThrowError("FieldArray '$root' failed to move: toIndex '1' is out of range");
    });
  });

  describe("#swap", () => {
    it("swaps fields of the specified indices of the array", async () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42, 43, 44, 45, 46],
      });
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 43, 44, 45, 46] })
      );
      const fields1 = fieldArray.getFields();
      expect(fields1).toHaveLength(5);
      expect(fields1.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
        expect.objectContaining({ defaultValue: 45, value: 45 }),
        expect.objectContaining({ defaultValue: 46, value: 46 }),
      ]);

      const subscriber = jest.fn(() => {});
      fieldArray.subscribeFields(subscriber);

      // swap with the same index = do nothing
      fieldArray.swap(2, 2);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 43, 44, 45, 46] })
      );
      const fields2 = fieldArray.getFields();
      expect(fields2).toHaveLength(5);
      expect(fields2[0].id).toBe(fields1[0].id);
      expect(fields2[1].id).toBe(fields1[1].id);
      expect(fields2[2].id).toBe(fields1[2].id);
      expect(fields2[3].id).toBe(fields1[3].id);
      expect(fields2[4].id).toBe(fields1[4].id);
      expect(fields2.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
        expect.objectContaining({ defaultValue: 45, value: 45 }),
        expect.objectContaining({ defaultValue: 46, value: 46 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(0);

      // swap forward
      fieldArray.swap(1, 3);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 45, 44, 43, 46] })
      );
      const fields3 = fieldArray.getFields();
      expect(fields3).toHaveLength(5);
      expect(fields3[0].id).toBe(fields2[0].id);
      expect(fields3[1].id).toBe(fields2[3].id);
      expect(fields3[2].id).toBe(fields2[2].id);
      expect(fields3[3].id).toBe(fields2[1].id);
      expect(fields3[4].id).toBe(fields2[4].id);
      expect(fields3.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 45, value: 45 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
        expect.objectContaining({ defaultValue: 43, value: 43 }),
        expect.objectContaining({ defaultValue: 46, value: 46 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(0);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(1);
      expect(subscriber).toHaveBeenLastCalledWith(fields3);

      fields3[3].setValue(1);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 45, 44, 1, 46] })
      );
      const fields4 = fieldArray.getFields();
      expect(fields4).toHaveLength(5);
      expect(fields4[0].id).toBe(fields3[0].id);
      expect(fields4[1].id).toBe(fields3[1].id);
      expect(fields4[2].id).toBe(fields3[2].id);
      expect(fields4[3].id).toBe(fields3[3].id);
      expect(fields4[4].id).toBe(fields3[4].id);
      expect(fields4.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 45, value: 45 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
        expect.objectContaining({ defaultValue: 43, value: 1 }),
        expect.objectContaining({ defaultValue: 46, value: 46 }),
      ]);

      // swap backward
      fieldArray.swap(3, 1);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 1, 44, 45, 46] })
      );
      const fields5 = fieldArray.getFields();
      expect(fields5).toHaveLength(5);
      expect(fields5[0].id).toBe(fields4[0].id);
      expect(fields5[1].id).toBe(fields4[3].id);
      expect(fields5[2].id).toBe(fields4[2].id);
      expect(fields5[3].id).toBe(fields4[1].id);
      expect(fields5[4].id).toBe(fields4[4].id);
      expect(fields5.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 43, value: 1 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
        expect.objectContaining({ defaultValue: 45, value: 45 }),
        expect.objectContaining({ defaultValue: 46, value: 46 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(1);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
      expect(subscriber).toHaveBeenLastCalledWith(fields5);

      fields5[3].setValue(2);
      expect(fieldArray.getSnapshot()).toEqual(
        expect.objectContaining({ value: [42, 1, 44, 2, 46] })
      );
      const fields6 = fieldArray.getFields();
      expect(fields6).toHaveLength(5);
      expect(fields6[0].id).toBe(fields5[0].id);
      expect(fields6[1].id).toBe(fields5[1].id);
      expect(fields6[2].id).toBe(fields5[2].id);
      expect(fields6[3].id).toBe(fields5[3].id);
      expect(fields6[4].id).toBe(fields5[4].id);
      expect(fields6.map(field => field.getSnapshot())).toEqual([
        expect.objectContaining({ defaultValue: 42, value: 42 }),
        expect.objectContaining({ defaultValue: 43, value: 1 }),
        expect.objectContaining({ defaultValue: 44, value: 44 }),
        expect.objectContaining({ defaultValue: 45, value: 2 }),
        expect.objectContaining({ defaultValue: 46, value: 46 }),
      ]);

      expect(subscriber).toHaveBeenCalledTimes(2);
      await waitForMicrotasks();
      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it("throws error if the index is out of range", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      expect(() => {
        fieldArray.swap(-1, 0);
      }).toThrowError("FieldArray '$root' failed to swap: aIndex '-1' is out of range");
      expect(() => {
        fieldArray.swap(1, 0);
      }).toThrowError("FieldArray '$root' failed to swap: aIndex '1' is out of range");
      expect(() => {
        fieldArray.swap(0, -1);
      }).toThrowError("FieldArray '$root' failed to swap: bIndex '-1' is out of range");
      expect(() => {
        fieldArray.swap(0, 1);
      }).toThrowError("FieldArray '$root' failed to swap: bIndex '1' is out of range");
    });
  });

  describe("#on", () => {
    it("adds an event listener", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const listener = jest.fn(() => {});
      const off = fieldArray.on("foo", listener);

      fieldArray.emit("foo");
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith(undefined);

      // can remove
      off();
      fieldArray.emit("foo");
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("#off", () => {
    it("removes an event listener", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const listener = jest.fn(() => {});
      fieldArray.on("foo", listener);

      fieldArray.emit("foo");
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith(undefined);

      fieldArray.off("foo", listener);
      fieldArray.emit("foo");
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("#emit", () => {
    it("emits an event to the listeners", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const listener = jest.fn(() => {});
      fieldArray.on("foo", listener);

      fieldArray.emit("foo");
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith(undefined);

      fieldArray.emit("foo", { test: "xxx" });
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith({ test: "xxx" });

      fieldArray.emit("bar");
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("emits an event to the children", () => {
      const fieldArray = new FieldArrayImpl({
        path: "$root",
        defaultValue: [0],
        value: [42],
      });
      const fields = fieldArray.getFields();
      expect(fields).toHaveLength(1);
      const field = fields[0];
      const listener = jest.fn(() => {});
      field.on("foo", listener);

      fieldArray.emit("foo");
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith(undefined);

      fieldArray.emit("foo", { test: "xxx" });
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith({ test: "xxx" });

      fieldArray.emit("bar");
      expect(listener).toHaveBeenCalledTimes(2);

      // do not emit after diconnected
      fieldArray.remove(0);
      fieldArray.emit("foo");
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });
});
