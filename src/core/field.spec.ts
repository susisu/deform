import { isValid } from "./field";

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
