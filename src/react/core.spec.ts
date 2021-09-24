import { triplet } from "@susisu/promise-utils";
import { act, renderHook } from "@testing-library/react-hooks";
import { waitForMicrotasks } from "../__tests__/utils";
import {
  ValidationRequest,
  createField,
  createFieldArray,
  createFieldNode,
  createForm,
} from "../core";
import {
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
    const t = renderHook(useForm, {
      initialProps: {
        defaultValue: 0,
        value: 42,
      },
    });
    expect(t.result.current.root.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isDirty: false,
      isTouched: false,
      errors: {},
      isPending: false,
    });

    const action = jest.fn(async () => {});
    await t.result.current.submit(action);
    expect(action).toHaveBeenCalledWith(expect.objectContaining({ value: 42 }));
  });

  it("returns the same form for every render", () => {
    const t = renderHook(useForm, {
      initialProps: {
        defaultValue: 0,
        value: 42,
      },
    });
    const form1 = t.result.current;

    t.rerender();
    const form2 = t.result.current;
    expect(form2.id).toBe(form1.id);
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
      isDirty: false,
      isTouched: false,
      errors: {},
      isPending: false,
    });

    await act(async () => {
      t.result.current.setValue(2);
    });
    expect(t.result.current.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 2,
      isDirty: true,
      isTouched: false,
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
      isDirty: false,
      isTouched: false,
      errors: { 0: false, 1: false },
      isPending: false,
    });

    await act(async () => {
      t.result.current.setValue([3]);
    });
    expect(t.result.current.getSnapshot()).toEqual({
      defaultValue: [0, 1],
      value: [3],
      isDirty: true,
      isTouched: false,
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
    });
    const t = renderHook(() => useFormState(form));
    expect(t.result.current).toEqual({
      isSubmitting: false,
      submitCount: 0,
    });

    await act(async () => {
      await form.submit(async () => {});
    });
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
      isDirty: false,
      isTouched: false,
      errors: {},
      isPending: false,
    });

    await act(async () => {
      field.setValue(42);
    });
    expect(t.result.current).toEqual({
      defaultValue: 0,
      value: 42,
      isDirty: true,
      isTouched: false,
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
      isDirty: false,
      isTouched: false,
      errors: {},
      isPending: false,
    });

    const [promise, resolve] = triplet<unknown>();
    const validator = jest.fn((_: ValidationRequest<number>) => promise);
    const t = renderHook(() => useValidator(field, "foo", validator));
    expect(validator).toHaveBeenCalledTimes(1);
    const req = validator.mock.calls[0][0];
    expect(req).toEqual(expect.objectContaining({ value: 42 }));
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isDirty: false,
      isTouched: false,
      errors: {},
      isPending: true,
    });

    resolve(true);
    await waitForMicrotasks();
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isDirty: false,
      isTouched: false,
      errors: { foo: true },
      isPending: false,
    });

    t.unmount();
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isDirty: false,
      isTouched: false,
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
      isDirty: false,
      isTouched: false,
      errors: {},
      isPending: false,
    });

    const [promise, resolve] = triplet<unknown>();
    const validator = jest.fn((_: ValidationRequest<number>) => promise);
    const t = renderHook(({ enabled }) => useValidator(field, "foo", validator, enabled), {
      initialProps: { enabled: true },
    });
    expect(validator).toHaveBeenCalledTimes(1);
    resolve(true);
    await waitForMicrotasks();
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isDirty: false,
      isTouched: false,
      errors: { foo: true },
      isPending: false,
    });

    t.rerender({ enabled: false });
    expect(field.getSnapshot()).toEqual({
      defaultValue: 0,
      value: 42,
      isDirty: false,
      isTouched: false,
      errors: {},
      isPending: false,
    });
  });
});
