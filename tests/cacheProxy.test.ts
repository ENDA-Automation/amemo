import * as fs from "fs";
import { describe, beforeEach, it, jest, expect } from "@jest/globals";
import { cacheProxy } from "../src/cache-proxy";
import { MemCacheStore } from "../src/mem-cache-store";

jest.mock("fs");

const mockFs = fs as jest.Mocked<typeof fs>;

jest.useFakeTimers();

class NestedNestedTest {
  public barCalls = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public bar(_ = "bar") {
    return this.barCalls++;
  }

  public readonly shouldNotBeCached = "shouldNotBeCached";
}

class NestedTest {
  public nested = new NestedNestedTest();
  public fooCalls = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async foo(_ = "foo") {
    return this.fooCalls++;
  }
}

class Test {
  public nested = new NestedTest();
  public mainCalls = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public main(_: string = "foo") {
    return this.mainCalls++;
  }
}

describe("cacheProxy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue("");
  });
  it("must cache calls", async () => {
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
    expect(await c.nested.foo()).toBe(0);
    expect(await c.nested.foo()).toBe(0);
    expect(await c.nested.foo()).toBe(0);
    expect(await c.nested.foo("invalidate")).toBe(1);
    expect(await c.nested.foo("invalidate again")).toBe(2);
    expect(await c.nested.foo("invalidate")).toBe(1);
    expect(await c.nested.foo()).toBe(0);
    expect(await c.nested.foo("invalidate again")).toBe(2);
    expect(c.nested.nested.bar()).toBe(0);
    expect(c.nested.nested.bar()).toBe(0);
    expect(c.nested.nested.bar("invalidate")).toBe(1);
    expect(c.nested.nested.bar("invalidate again")).toBe(2);
    expect(c.nested.nested.bar("invalidate")).toBe(1);
    expect(c.nested.nested.bar()).toBe(0);
    expect(c.nested.nested.bar("invalidate again")).toBe(2);
  });

  it("must respect the default expire", () => {
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

  it("must respect the path expire", async () => {
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

    expect(await c.nested.foo()).toBe(0);
    expect(await c.nested.foo()).toBe(0);
    jest.advanceTimersByTime(101);
    expect(await c.nested.foo()).toBe(0);
    expect(await c.nested.foo()).toBe(0);
    jest.advanceTimersByTime(101);
    expect(await c.nested.foo()).toBe(1);
    expect(await c.nested.foo()).toBe(1);

    expect(c.nested.nested.bar()).toBe(0);
    expect(c.nested.nested.bar()).toBe(0);
    jest.advanceTimersByTime(101);
    expect(c.nested.nested.bar()).toBe(0);
    expect(c.nested.nested.bar()).toBe(0);
    jest.advanceTimersByTime(301);
    expect(c.nested.nested.bar()).toBe(1);
    expect(c.nested.nested.bar()).toBe(1);
  });

  jest.mock("fs");

  it("must persist the cache", () => {
    const t = new Test();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      '{"/main: []": {"value": 1, "expire": 100}}',
    );
    const c = cacheProxy(t);
    expect(c.main()).toBe(1);
    expect(c.main()).toBe(1);
  });

  it("must handle broken cache", () => {
    const t = new Test();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("garbage");
    const c = cacheProxy(t);
    expect(c.main()).toBe(0);
    expect(c.main()).toBe(0);
  });

  it("must save the cache", async () => {
    const t = new Test();
    const c = cacheProxy(t);
    c.main();
    c.main();
    const w = mockFs.writeFileSync.mockImplementation(() => {});
    expect(w).toBeCalledTimes(1);

    await c.nested.foo();
    expect(w).toBeCalledTimes(2);
  });

  it("must handle promises", async () => {
    const t = new Test();
    const c = cacheProxy(t);
    expect(c.nested.nested.bar()).not.toBeInstanceOf(Promise);
    const r1 = c.nested.foo();
    expect(r1).toBeInstanceOf(Promise);
    // expect(await r1).toBe(0);
    const r2 = await c.nested.foo();
    expect(r2).toBe(0);
    const r3 = await c.nested.foo();
    expect(r3).toBe(0);
  });

  it("must persist promises", async () => {
    let mockFile = "";
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue("");
    mockFs.writeFileSync.mockImplementation(
      (file, data) => (mockFile = data as string),
    );
    const t = new Test();
    const c = cacheProxy(t);
    expect(c.nested.foo()).toBeInstanceOf(Promise);
    expect(await c.nested.foo()).toBe(0);
    expect(await c.nested.foo()).toBe(0);
    const parsed = JSON.parse(mockFile);
    expect(parsed["/nested/foo: []"]["value"]).toBe(0);
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(mockFile);
    const t2 = new Test();
    const c2 = cacheProxy(t2);
    expect(c2.nested.foo()).not.toBeInstanceOf(Promise);
    expect(c2.nested.foo()).toBe(0);
    expect(await c2.nested.foo()).toBe(0);
  });

  it("must support in memory cache", async () => {
    const t = new Test();
    const cacheStore = new MemCacheStore();
    const c = cacheProxy(t, {
      cacheStore,
    });
    expect(c.main()).toBe(0);
    expect(c.main()).toBe(0);
  });

  it("must not cache non-functions", async () => {
    const t = new Test();
    const c = cacheProxy(t);
    const write = mockFs.writeFileSync.mockImplementation(() => {});
    expect(c.nested.nested.shouldNotBeCached).toBe("shouldNotBeCached");
    expect(c.nested.nested.shouldNotBeCached).toBe("shouldNotBeCached");
    expect(write).toBeCalledTimes(0);
    expect(c.main()).toBe(0);
    expect(c.main()).toBe(0);
    expect(write).toBeCalledTimes(1);
  });
});
