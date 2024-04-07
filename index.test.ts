import fs from "fs";
import { describe, beforeEach, it, jest, expect } from "@jest/globals";
import { cacheProxy } from "./index";

jest.mock("fs");
jest.useFakeTimers();

class NestedNestedTest {
  public barCalls = 0;
  public bar(_ = "bar") {
    return this.barCalls++;
  }
}

class NestedTest {
  public nested = new NestedNestedTest();
  public fooCalls = 0;
  public foo(_ = "foo") {
    return this.fooCalls++;
  }
}

class Test {
  public nested = new NestedTest();
  public mainCalls = 0;
  public main(_: string = "foo") {
    console.log("main called", this.mainCalls);
    return this.mainCalls++;
  }
}
describe("cacheProxy", () => {
  beforeEach(() => {});
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
    expect(c.main("invalidate")).toBe(1);
    expect(c.nested.foo()).toBe(0);
    expect(c.nested.foo()).toBe(0);
    expect(c.nested.foo()).toBe(0);
    expect(c.nested.foo("invalidate")).toBe(1);
    expect(c.nested.foo("invalidate again")).toBe(2);
    expect(c.nested.foo("invalidate")).toBe(1);
    expect(c.nested.foo()).toBe(0);
    expect(c.nested.foo("invalidate again")).toBe(2);
    expect(c.nested.nested.bar()).toBe(0);
    expect(c.nested.nested.bar()).toBe(0);
    expect(c.nested.nested.bar("invalidate")).toBe(1);
    expect(c.nested.nested.bar("invalidate again")).toBe(2);
    expect(c.nested.nested.bar("invalidate")).toBe(1);
    expect(c.nested.nested.bar()).toBe(0);
    expect(c.nested.nested.bar("invalidate again")).toBe(2);
  });

  it("should respect the default expire", () => {
    const t = new Test();
    const c = cacheProxy(t, {
      defaultExpire: 100,
    });
    expect(c.main()).toBe(0);
    expect(c.main()).toBe(0);
    jest.advanceTimersByTime(101);
    expect(c.main()).toBe(1);
    expect(c.main()).toBe(1);
  });

  it("should respect the path expire", () => {
    const t = new Test();
    const c = cacheProxy(t, {
      pathExpire: {
        "/main": 100,
        "/nested/foo": 200,
        "/nested/nested/bar": 300,
      },
    });
    expect(c.main()).toBe(0);
    expect(c.main()).toBe(0);
    jest.advanceTimersByTime(101);
    expect(c.main()).toBe(1);
    expect(c.main()).toBe(1);

    expect(c.nested.foo()).toBe(0);
    expect(c.nested.foo()).toBe(0);
    jest.advanceTimersByTime(101);
    expect(c.nested.foo()).toBe(0);
    expect(c.nested.foo()).toBe(0);
    jest.advanceTimersByTime(101);
    expect(c.nested.foo()).toBe(1);
    expect(c.nested.foo()).toBe(1);

    expect(c.nested.nested.bar()).toBe(0);
    expect(c.nested.nested.bar()).toBe(0);
    jest.advanceTimersByTime(101);
    expect(c.nested.nested.bar()).toBe(0);
    expect(c.nested.nested.bar()).toBe(0);
    jest.advanceTimersByTime(301);
    expect(c.nested.nested.bar()).toBe(1);
    expect(c.nested.nested.bar()).toBe(1);
  });
});
