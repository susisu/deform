import { waitForMicrotasks } from "../../__tests__/utils";
import { FieldNode } from "../form";
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
    it("sets the default value of the field", async () => {
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
});
