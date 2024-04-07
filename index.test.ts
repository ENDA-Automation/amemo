import fs from "fs";
import { describe, beforeEach, it, jest, expect } from "@jest/globals";
import { cacheProxy } from "./index.js";

class NestedNestedTest {
  public barCalls = 0;
  public bar() {
    return this.barCalls++;
  }
}

class NestedTest {
  public nested = new NestedNestedTest();
  public fooCalls = 0;
  public foo() {
    return this.fooCalls++;
  }
}

class Test {
  public nested = new NestedTest();
  public mainCalls = 0;
  public main() {
    console.log("main called", this.mainCalls);
    return this.mainCalls++;
  }
}
describe("cacheProxy", () => {
  beforeEach(() => {
    jest.mock("fs", () => ({
      existsSync: () => false,
      readFileSync: () => "",
      writeFileSync: () => {},
    }));
  });
  it("cache calls", () => {
    expect(true).toBeTruthy();
    let hit = 0;
    let miss = 0;
    const t = new Test();
    const c = cacheProxy(t, {
      onHit: () => hit++,
      onMiss: () => miss++,
    });
    expect(t.mainCalls).toBe(0);
    expect(t.nested.fooCalls).toBe(0);
    expect(t.nested.nested.barCalls).toBe(0);
    const r = c.main();
    expect(r).toBe(0);
    expect(hit).toBe(0);
    expect(miss).toBe(1);
    expect(t.mainCalls).toBe(1);
    expect(t.nested.fooCalls).toBe(0);
    expect(t.nested.nested.barCalls).toBe(0);
    const r2 = c.main();
    expect(r2).toBe(0);
    expect(hit).toBe(1);
    expect(miss).toBe(1);
    expect(t.mainCalls).toBe(1);
    expect(t.nested.fooCalls).toBe(0);
    expect(t.nested.nested.barCalls).toBe(0);
  });
});
