import { generateId } from "./shared";

describe("generateId", () => {
  it("generates a unique identifier starting with the given tag", () => {
    const id1 = generateId("foo");
    const id2 = generateId("foo");
    expect(id1).toMatch(/^foo:/);
    expect(id2).toMatch(/^foo:/);
    expect(id1).not.toBe(id2);
  });
});
