import { act, renderHook } from "@testing-library/react-hooks";
import {
  ValidationRequest,
  createField,
  createFieldArray,
  createFieldNode,
  createForm,
} from "../core";
import {
  createValidationHook,
  useChild,
  useChildArray,
  useFields,
  useForm,
  useFormState,
  useSnapshot,
  useValidator,
} from "./core";

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

describe("useChild", () => {
  it("creates a new child field", async () => {
    const field = createFieldNode({
      defaultValue: { x: 0, y: 1 },
      value: { x: 42, y: 43 },
    });
    const t = renderHook(() => useChild(field, "x"));
    expect(t.result.current.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });

    await act(async () => {
      t.result.current.setValue(2);
    });
    expect(t.result.current.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 2,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });
    // connected to the parent
    expect(field.getSnapshot()).toEqual(
      expect.objectContaining({
        defaultValue: { x: 0, y: 1 },
        value: { x: 2, y: 43 },
      })
    );
  });

  it("returns the same field for every render", () => {
    const field = createFieldNode({
      defaultValue: { x: 0, y: 1 },
      value: { x: 42, y: 43 },
    });
    const t = renderHook(() => useChild(field, "x"));
    const field1 = t.result.current;

    t.rerender();
    const field2 = t.result.current;
    expect(field2.id).toBe(field1.id);
  });
});

describe("useChildArray", () => {
  it("creates a new child field array", async () => {
    const field = createFieldNode({
      defaultValue: { x: [0, 1], y: 2 },
      value: { x: [42, 43], y: 44 },
    });
    const t = renderHook(() => useChildArray(field, "x"));
    expect(t.result.current.getSnapshot()).toEqual({
      defaultValue: [0, 1],
      value: [42, 43],
      isTouched: false,
      isDirty: false,
      errors: { 0: false, 1: false },
      isPending: false,
    });

    await act(async () => {
      t.result.current.setValue([3]);
    });
    expect(t.result.current.getSnapshot()).toEqual({
      defaultValue: [0, 1],
      value: [3],
      isTouched: false,
      isDirty: false,
      errors: { 0: false },
      isPending: false,
    });
    // connected to the parent
    expect(field.getSnapshot()).toEqual(
      expect.objectContaining({
        defaultValue: { x: [0, 1], y: 2 },
        value: { x: [3], y: 44 },
      })
    );
  });

  it("returns the same field array for every render", () => {
    const field = createFieldNode({
      defaultValue: { x: [0, 1], y: 2 },
      value: { x: [42, 43], y: 44 },
    });
    const t = renderHook(() => useChildArray(field, "x"));
    const field1 = t.result.current;

    t.rerender();
    const field2 = t.result.current;
    expect(field2.id).toBe(field1.id);
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

describe("useSnapshot", () => {
  it("subscribes the snapshot of a field", async () => {
    const field = createField({
      defaultValue: 0,
    });
    const t = renderHook(() => useSnapshot(field));
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

describe("useValidator", () => {
  it("attaches a validator to a field", async () => {
    const field = createField({
      defaultValue: 0,
      value: 42,
    });
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });

    const validator = jest.fn((_: ValidationRequest<number>) => {});
    const t = renderHook(() => useValidator(field, "foo", validator));
    expect(validator).toHaveBeenCalledTimes(1);
    const req = validator.mock.calls[0][0];
    expect(req).toEqual(expect.objectContaining({ value: 42 }));
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: true,
    });

    req.resolve(true);
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: { foo: true },
      isPending: false,
    });

    t.unmount();
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });
  });
});

describe("createValidationHook", () => {
  it("creates a hook that validates a a field", async () => {
    const field = createField({
      defaultValue: 0,
      value: 42,
    });
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });

    const validator = jest.fn((_: ValidationRequest<number>) => {});
    const useValidation = createValidationHook("foo", validator);
    const t = renderHook(() => useValidation(field));
    expect(validator).toHaveBeenCalledTimes(1);
    const req = validator.mock.calls[0][0];
    expect(req).toEqual(expect.objectContaining({ value: 42 }));
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: true,
    });

    req.resolve(true);
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: { foo: true },
      isPending: false,
    });

    t.unmount();
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });
  });

  it("disables validation if enabled = false is set", async () => {
    const field = createField({
      defaultValue: 0,
      value: 42,
    });
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });

    const validator = jest.fn((_: ValidationRequest<number>) => {});
    const useValidation = createValidationHook("foo", validator);
    const t = renderHook(({ enabled }) => useValidation(field, enabled), {
      initialProps: { enabled: true },
    });
    expect(validator).toHaveBeenCalledTimes(1);
    const req = validator.mock.calls[0][0];
    expect(req).toEqual(expect.objectContaining({ value: 42 }));
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: true,
    });

    req.resolve(true);
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: { foo: true },
      isPending: false,
    });

    t.rerender({ enabled: false });
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });
  });

  it("can override the key associated with the validator", async () => {
    const field = createField({
      defaultValue: 0,
      value: 42,
    });
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: {},
      isPending: false,
    });

    const validator = jest.fn((_: ValidationRequest<number>) => {});
    const useValidation = createValidationHook("foo", validator);
    renderHook(() => useValidation(field, true, "bar"));
    expect(validator).toHaveBeenCalledTimes(1);
    const req = validator.mock.calls[0][0];
    req.resolve(true);
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isTouched: false,
      isDirty: false,
      errors: { bar: true },
      isPending: false,
    });
  });
});
