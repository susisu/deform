import { equalFieldErrors, isValid } from "./field";

describe("equalFieldErrors", () => {
  const obj = { id: 42 };

  it.each([
    // equal if both keys and values match
    [{}, {}, true],
    [{ foo: true, bar: false }, { foo: true, bar: false }, true],
    // not equal if values do not match
    [{ foo: true, bar: false }, { foo: true, bar: true }, false],
    [{ foo: true, bar: true }, { foo: true, bar: false }, false],
    // not equal if keys do not match
    [{ foo: true, bar: false }, { foo: true }, false],
    [{ foo: true }, { foo: true, bar: false }, false],
    [{ foo: true, bar: false }, { foo: true, baz: false }, false],
    [{ foo: true, baz: false }, { foo: true, bar: false }, false],
    // values are shallowly compared (by Object.is)
    [{ foo: obj }, { foo: obj }, true],
    [{ foo: { ...obj } }, { foo: { ...obj } }, false],
  ])(
    "compares two FieldErrors objects and returns true if they are equal / equal(%s, %s) = %s",
    (a, b, expected) => {
      expect(equalFieldErrors(a, b)).toBe(expected);
    }
  );
});

describe("isValid", () => {
  it.each([
    [{}, true],
    [{ foo: false, bar: false }, true],
    [{ foo: true, bar: false }, false],
    [{ foo: false, bar: true }, false],
    [{ foo: true, bar: true }, false],
    // a value is considered to be an error if it is truthy
    [{ foo: 42 }, false],
    [{ foo: "xxx" }, false],
    [{ foo: {} }, false],
    [{ foo: 0 }, true],
    [{ foo: "" }, true],
    [{ foo: null }, true],
    [{ foo: undefined }, true],
  ])(
    "returns true if a FieldErrors object has no errors / isValid(%s) = %s",
    (errors, expected) => {
      expect(isValid(errors)).toBe(expected);
    }
  );
});
