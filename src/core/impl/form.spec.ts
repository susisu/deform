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
});
