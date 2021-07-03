import { waitForMicrotasks } from "../../__tests__/utils";
import { FieldNode, ValidationRequest } from "../form";
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
});
