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
});
