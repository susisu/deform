import { act, renderHook } from "@testing-library/react-hooks";
import { createFieldArray, createFieldNode, createForm } from "../core/utils";
import { useFieldSnapshot, useFields, useForm, useFormState } from "./core";

describe("useForm", () => {
  it("creates a new form", async () => {
    const handler = jest.fn(async () => {});
    const t = renderHook(useForm, {
      initialProps: {
        defaultValue: 0,
        value: 42,
        handler,
      },
    });
    expect(t.result.current.root.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });

    await t.result.current.submit();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ value: 42 }));
  });

  it("returns the same form for every render", () => {
    const t = renderHook(useForm, {
      initialProps: {
        defaultValue: 0,
        value: 42,
        handler: async () => {},
      },
    });
    const form1 = t.result.current;

    t.rerender();
    const form2 = t.result.current;
    expect(form2.id).toBe(form1.id);
  });

  it("follows the updates of the handler function", async () => {
    const handler1 = jest.fn(async () => {});
    const t = renderHook(useForm, {
      initialProps: {
        defaultValue: 0,
        value: 42,
        handler: handler1,
      },
    });
    expect(t.result.current.root.getSnapshot()).toEqual(
      expect.objectContaining({ defaultValue: 0, value: 42 })
    );

    const handler2 = jest.fn(async () => {});
    t.rerender({
      defaultValue: 1,
      value: 43,
      handler: handler2,
    });
    // defaultValue and value are not updated
    expect(t.result.current.root.getSnapshot()).toEqual(
      expect.objectContaining({ defaultValue: 0, value: 42 })
    );

    // handler is updated
    await t.result.current.submit();
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledWith(expect.objectContaining({ value: 42 }));
  });
});

describe("useFormState", () => {
  it("subscribes the state of a form", async () => {
    const form = createForm({
      defaultValue: 0,
      handler: async () => {},
    });
    const t = renderHook(() => useFormState(form));
    expect(t.result.current).toEqual({
      isSubmitting: false,
      submitCount: 0,
    });

    await act(() => form.submit());
    expect(t.result.current).toEqual({
      isSubmitting: false,
      submitCount: 1,
    });
  });
});

describe("useFieldSnapshot", () => {
  it("subscribes the snapshot of a field", async () => {
    const field = createFieldNode({
      defaultValue: 0,
    });
    const t = renderHook(() => useFieldSnapshot(field));
    expect(t.result.current).toEqual({
      defaultValue: 0,
      value: 0,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });

    await act(async () => {
      field.setValue(42);
    });
    expect(t.result.current).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });
  });
});

describe("useFields", () => {
  it("subscribes the fields of a field array", async () => {
    const fieldArray = createFieldArray({
      defaultValue: [0, 1],
    });
    const t = renderHook(() => useFields(fieldArray));
    expect(t.result.current).toHaveLength(2);
    expect(t.result.current.map(field => field.getSnapshot())).toEqual([
      expect.objectContaining({ defaultValue: 0, value: 0 }),
      expect.objectContaining({ defaultValue: 1, value: 1 }),
    ]);

    await act(async () => {
      fieldArray.append(2);
    });
    expect(t.result.current).toHaveLength(3);
    expect(t.result.current.map(field => field.getSnapshot())).toEqual([
      expect.objectContaining({ defaultValue: 0, value: 0 }),
      expect.objectContaining({ defaultValue: 1, value: 1 }),
      expect.objectContaining({ defaultValue: 2, value: 2 }),
    ]);
  });
});
