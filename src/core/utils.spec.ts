import { createField, createFieldArray, createFieldNode, createForm } from "./utils";

describe("createForm", () => {
  it("creates a Form", async () => {
    const handler = jest.fn(async () => {});
    const form = createForm({ defaultValue: 0, handler });
    expect(form.getState()).toEqual({
      isSubmitting: false,
      submitCount: 0,
    });
    expect(form.root.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 0,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });

    await form.submit();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(expect.objectContaining({ value: 0 }));
    expect(form.getState()).toEqual({
      isSubmitting: false,
      submitCount: 1,
    });
  });

  it("can set an initial value", () => {
    const form = createForm({ defaultValue: 0, value: 1, handler: async () => {} });
    expect(form.getState()).toEqual({
      isSubmitting: false,
      submitCount: 0,
    });
    expect(form.root.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 1,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });
  });
});

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

describe("createField", () => {
  it("creates a Field", () => {
    const field = createField({ defaultValue: 0 });
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
    const field = createField({ defaultValue: 0, value: 1 });
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
