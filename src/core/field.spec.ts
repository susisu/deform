import { isEqualErrors, isValid } from "./field";

describe("isEqualErrors", () => {
  const errors = { foo: true };
  const obj = { id: 42 };

  it.each([
    ["empty", {}, {}, true],
    ["same objects", errors, errors, true],
    ["same keys and values", { foo: true }, { foo: true }, true],
    ["no keys", { foo: true }, {}, false],
    ["different keys", { foo: true }, { bar: true }, false],
    ["same keys but different values", { foo: true }, { foo: false }, false],
    ["extra keys", { foo: true }, { foo: true, bar: true }, false],
    ["object values", { foo: {} }, { foo: {} }, false],
    ["same object values", { foo: obj }, { foo: obj }, true],
  ])("checks if two FieldErrors object are equal / %s", (_title, a, b, expected) => {
    expect(isEqualErrors(a, b)).toBe(expected);
  });
});

describe("isValid", () => {
  it.each([
    [{}, true],
    [{ foo: false, bar: false }, true],
    [{ foo: true, bar: false }, false],
    [{ foo: true, bar: true }, false],
    [{ foo: {}, bar: false }, false],
  ])("checks if a FieldErrors object contains no errors / %j", (errors, expected) => {
    expect(isValid(errors)).toBe(expected);
  });
});
