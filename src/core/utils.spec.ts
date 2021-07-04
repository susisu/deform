import { createFieldArray, createFieldNode } from "./utils";

describe("createFieldNode", () => {
  it("creates a FieldNode", () => {
    const field = createFieldNode({ defaultValue: 0 });
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 0,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });
  });

  it("can set an initial value", () => {
    const field = createFieldNode({ defaultValue: 0, value: 1 });
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

describe("createFieldArray", () => {
  it("creates a FieldArray", () => {
    const fieldArray = createFieldArray({ defaultValue: [0] });
    expect(fieldArray.getSnapshot()).toEqual({
      defaultValue: [0],
      value: [0],
      isTouched: false,
      isDirty: false,
      errors: { 0: false },
      isPending: false,
    });
  });

  it("can set an initial value", () => {
    const fieldArray = createFieldArray({ defaultValue: [0], value: [1, 2] });
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
