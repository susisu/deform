import { FormImpl } from "./form";

describe("FormImpl", () => {
  describe("#root", () => {
    it("is a root field of the form", () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      expect(form.root.getSnapshot()).toEqual({
        defaultValue: { x: 0, y: 1 },
        value: { x: 0, y: 1 },
        isTouched: false,
        isDirty: false,
        errors: {},
        isPending: false,
      });
    });

    it("can be initialized with an initial value other than the default value", () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        handler: async () => {},
      });
      expect(form.root.getSnapshot()).toEqual({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        isTouched: false,
        isDirty: false,
        errors: {},
        isPending: false,
      });
    });
  });

  describe("#reset", () => {
    it("resets the field", () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      form.root.setValue({ x: 42, y: 43 });
      form.root.setTouched();
      form.root.setDirty();
      form.root.setCustomErrors({ foo: true });
      form.root.addValidator("bar", ({ resolve }) => {
        resolve(true);
      });
      expect(form.root.getSnapshot()).toEqual({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        isTouched: true,
        isDirty: true,
        errors: { foo: true, bar: true },
        isPending: false,
      });

      form.reset();
      expect(form.root.getSnapshot()).toEqual({
        defaultValue: { x: 0, y: 1 },
        value: { x: 0, y: 1 },
        isTouched: false,
        isDirty: false,
        errors: { bar: true },
        isPending: false,
      });
    });

    it("can set the default value before resetting", () => {
      const form = new FormImpl({
        defaultValue: { x: 0, y: 1 },
        handler: async () => {},
      });
      form.root.setValue({ x: 42, y: 43 });
      form.root.setTouched();
      form.root.setDirty();
      form.root.setCustomErrors({ foo: true });
      form.root.addValidator("bar", ({ resolve }) => {
        resolve(true);
      });
      expect(form.root.getSnapshot()).toEqual({
        defaultValue: { x: 0, y: 1 },
        value: { x: 42, y: 43 },
        isTouched: true,
        isDirty: true,
        errors: { foo: true, bar: true },
        isPending: false,
      });

      form.reset({ x: 2, y: 3 });
      expect(form.root.getSnapshot()).toEqual({
        defaultValue: { x: 2, y: 3 },
        value: { x: 2, y: 3 },
        isTouched: false,
        isDirty: false,
        errors: { bar: true },
        isPending: false,
      });
    });
  });
});
