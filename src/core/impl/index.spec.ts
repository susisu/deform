import { createField, createFieldArray, createFieldNode, createForm } from ".";

describe("createForm", () => {
  it("creates a Form", async () => {
    const form = createForm({ defaultValue: 0 });
    expect(form.getState()).toEqual({
      isSubmitting: false,
      submitCount: 0,
    });
    expect(form.root.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 0,
      isDirty: false,
      isTouched: false,
      errors: {},
      isPending: false,
    });

    const action = jest.fn(async () => {});
    await form.submit(action);
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenLastCalledWith(expect.objectContaining({ value: 0 }));
    expect(form.getState()).toEqual({
      isSubmitting: false,
      submitCount: 1,
    });
  });

  it("can set an initial value", () => {
    const form = createForm({ defaultValue: 0, value: 1 });
    expect(form.getState()).toEqual({
      isSubmitting: false,
      submitCount: 0,
    });
    expect(form.root.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 1,
      isDirty: false,
      isTouched: false,
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
      isDirty: false,
      isTouched: false,
      errors: {},
      isPending: false,
    });
  });

  it("can set an initial value", () => {
    const field = createFieldNode({ defaultValue: 0, value: 1 });
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 1,
      isDirty: false,
      isTouched: false,
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
      isDirty: false,
      isTouched: false,
      errors: { 0: false },
      isPending: false,
    });
  });

  it("can set an initial value", () => {
    const fieldArray = createFieldArray({ defaultValue: [0], value: [1, 2] });
    expect(fieldArray.getSnapshot()).toEqual({
      defaultValue: [0],
      value: [1, 2],
      isDirty: false,
      isTouched: false,
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
      isDirty: false,
      isTouched: false,
      errors: {},
      isPending: false,
    });
  });

  it("can set an initial value", () => {
    const field = createField({ defaultValue: 0, value: 1 });
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 1,
      isDirty: false,
      isTouched: false,
      errors: {},
      isPending: false,
    });
  });
});
