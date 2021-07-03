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
});
