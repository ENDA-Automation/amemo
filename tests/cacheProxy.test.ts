import * as fs from "fs";
import { describe, beforeEach, it, jest, expect } from "@jest/globals";
import { amemo, FileCacheStore } from "../src/amemo.node";
import { MemCacheStore } from "../src/mem-cache-store";

jest.mock("fs");

const mockFs = fs as jest.Mocked<typeof fs>;

jest.useFakeTimers();

export class MockFileSystem {
  private files: Record<string, string> = {};

  setup() {
    mockFs.existsSync.mockImplementation((file) => {
      return this.files[file as string] !== undefined;
    });

    mockFs.readFileSync.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (file) => this.files[file as string] as any,
    );

    mockFs.writeFileSync.mockImplementation(
      (file, data) => (this.files[file as string] = data as string),
    );

    mockFs.unlinkSync.mockImplementation((file) => {
      if (this.files[file as string] === undefined) {
        // ENOENT
        throw new Error(`ENOENT: no such file or directory, unlink '${file}'`);
      }
      delete this.files[file as string];
    });
  }

  setFile(path: string, content: string) {
    this.files[path] = content;
  }

  getFile(path: string): string | undefined {
    return this.files[path];
  }

  clear() {
    this.files = {};
  }

  setupEmpty() {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue("");
  }

  setupWithCache(cacheContent: string) {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(cacheContent);
  }
}

class NestedNestedTest {
  public barCalls = 0;
  public throwCalls = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public bar(_ = "bar") {
    return this.barCalls++;
  }

  public async throws() {
    this.throwCalls++;
    throw new Error("This method should not be cached");
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

describe("amemo", () => {
  let mockFileSystem: MockFileSystem;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFileSystem = new MockFileSystem();
    mockFileSystem.setupEmpty();
  });
  it("must cache calls", async () => {
    let hit = 0;
    let miss = 0;
    const t = new Test();
    const c = amemo(t, {
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
    const c = amemo(t, {
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
    const c = amemo(t, {
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

  it("must persist the cache", () => {
    const t = new Test();
    mockFileSystem.setupWithCache('{"/main: []": {"value": 1, "expire": 100}}');
    const c = amemo(t, {
      cacheStore: new FileCacheStore(),
    });
    expect(c.main()).toBe(1);
    expect(c.main()).toBe(1);
  });

  it("must handle broken cache", () => {
    const t = new Test();
    mockFileSystem.setupWithCache("garbage");
    const c = amemo(t);
    expect(c.main()).toBe(0);
    expect(c.main()).toBe(0);
  });

  it("must save the cache", async () => {
    const t = new Test();
    const c = amemo(t, {
      cacheStore: new FileCacheStore(),
    });
    c.main();
    c.main();
    const w = mockFs.writeFileSync.mockImplementation(() => {});
    expect(w).toBeCalledTimes(1);

    await c.nested.foo();
    expect(w).toBeCalledTimes(2);
  });

  it("must handle promises", async () => {
    const t = new Test();
    const c = amemo(t);
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
    mockFileSystem.setup();

    const t = new Test();
    let cacheStore = new FileCacheStore();
    const c = amemo(t, {
      cacheStore,
    });
    expect(c.nested.foo()).toBeInstanceOf(Promise);
    expect(await c.nested.foo()).toBe(0);
    expect(await c.nested.foo()).toBe(0);
    const parsed = JSON.parse(mockFileSystem.getFile(".amemo.json")!);
    expect(parsed["/nested/foo: []"]["value"]).toBe(0);

    mockFileSystem.setupWithCache(mockFileSystem.getFile(".amemo.json")!);
    const t2 = new Test();
    cacheStore = new FileCacheStore();
    const c2 = amemo(t2, {
      cacheStore,
    });
    const p = c2.nested.foo();
    expect(p).toBeInstanceOf(Promise);
    expect(p.then).toBeDefined();
    expect(await c2.nested.foo()).toBe(0);
  });

  it("must persist rejected promises", async () => {
    mockFileSystem.setup();

    const t = new Test();
    let cacheStore = new FileCacheStore();
    const c = amemo(t, {
      cacheStore,
    });

    try {
      await c.nested.nested.throws();
      expect(true).toBe(false);
    } catch (e) {
      expect(e.message).toBe("This method should not be cached");
      expect(c.nested.nested.throwCalls).toBe(1);
      expect(t.nested.nested.throwCalls).toBe(1);
    }

    try {
      await c.nested.nested.throws();
      expect(true).toBe(false); // should not reach here
    } catch (e) {
      expect(e.message).toBe("This method should not be cached");
      expect(c.nested.nested.throwCalls).toBe(1);
    }
    cacheStore = new FileCacheStore();
    const c2 = amemo(new Test(), {
      cacheStore,
    });
    try {
      await c2.nested.nested.throws();
      expect(true).toBe(false); // should not reach here
    } catch (e) {
      expect(e.message).toBe("This method should not be cached");
      expect(c2.nested.nested.throwCalls).toBe(0);
    }
  });

  it("must support in memory cache", async () => {
    const t = new Test();
    const cacheStore = new MemCacheStore();
    const c = amemo(t, {
      cacheStore,
    });
    expect(c.main()).toBe(0);
    expect(c.main()).toBe(0);
  });

  it("must not cache non-functions", async () => {
    const t = new Test();
    const c = amemo(t, {
      cacheStore: new FileCacheStore(),
    });
    const write = mockFs.writeFileSync.mockImplementation(() => {});
    expect(c.nested.nested.shouldNotBeCached).toBe("shouldNotBeCached");
    expect(c.nested.nested.shouldNotBeCached).toBe("shouldNotBeCached");
    expect(write).toBeCalledTimes(0);
    expect(c.main()).toBe(0);
    expect(c.main()).toBe(0);
    expect(write).toBeCalledTimes(1);
  });

  it("must be able to cache simple functions too in addition to methods", async () => {
    let i = 0;
    function foo(key: string) {
      return key + i++;
    }

    const c = amemo(foo);
    const r1 = c("foo");
    const r2 = c("foo");
    expect(r1).toBe("foo0");
    expect(r1).toBe(r2);
    expect(c("bar")).toBe("bar1");
    expect(c("foo")).toBe("foo0"); // should still be cached
    expect(c("baz")).toBe("baz2");
  });

  it("must cache async functions", async () => {
    let i = 0;
    async function asyncFoo(key: string) {
      return key + i++;
    }

    const c = amemo(asyncFoo);
    const r1 = await c("foo");
    const r2 = await c("foo");
    expect(r1).toBe("foo0");
    expect(r1).toBe(r2);
    expect(await c("bar")).toBe("bar1");
    expect(await c("foo")).toBe("foo0"); // should still be cached
  });

  it("must cache functions with complex return types", () => {
    let i = 0;
    function complexFoo(key: string) {
      return { key, value: i++, nested: { count: i } };
    }

    const c = amemo(complexFoo);
    const r1 = c("foo");
    const r2 = c("foo");
    expect(r1).toEqual({ key: "foo", value: 0, nested: { count: 1 } });
    expect(r1).toBe(r2); // should be exact same reference
    expect(c("bar")).toEqual({ key: "bar", value: 1, nested: { count: 2 } });
  });

  it("must cache functions with multiple parameters", () => {
    let i = 0;
    function multiFoo(a: string, b: number, c: boolean) {
      return `${a}-${b}-${c}-${i++}`;
    }

    const c = amemo(multiFoo);
    const r1 = c("test", 42, true);
    const r2 = c("test", 42, true);
    expect(r1).toBe("test-42-true-0");
    expect(r1).toBe(r2);
    expect(c("test", 42, false)).toBe("test-42-false-1");
    expect(c("test", 43, true)).toBe("test-43-true-2");
    expect(c("test", 42, true)).toBe("test-42-true-0"); // original cached
  });

  it("must cache functions with no parameters", () => {
    let i = 0;
    function noParamFoo() {
      return `result-${i++}`;
    }

    const c = amemo(noParamFoo);
    const r1 = c();
    const r2 = c();
    expect(r1).toBe("result-0");
    expect(r1).toBe(r2);
  });

  it("must respect expiration for cached functions", () => {
    let i = 0;
    function expireFoo(key: string) {
      return key + i++;
    }

    const c = amemo(expireFoo, {
      defaultExpire: 100,
    });
    expect(c("foo")).toBe("foo0");
    expect(c("foo")).toBe("foo0");
    jest.advanceTimersByTime(101);
    expect(c("foo")).toBe("foo1");
    expect(c("foo")).toBe("foo1");
  });

  it("must support hit/miss callbacks for cached functions", () => {
    let hit = 0;
    let miss = 0;
    let i = 0;
    function callbackFoo(key: string) {
      return key + i++;
    }

    const c = amemo(callbackFoo, {
      onHit: () => hit++,
      onMiss: () => miss++,
    });

    expect(c("foo")).toBe("foo0");
    expect(hit).toBe(0);
    expect(miss).toBe(1);

    expect(c("foo")).toBe("foo0");
    expect(hit).toBe(1);
    expect(miss).toBe(1);

    expect(c("bar")).toBe("bar1");
    expect(hit).toBe(1);
    expect(miss).toBe(2);
  });

  it("must persist cached functions to file", () => {
    let i = 0;
    function persistFoo(key: string) {
      return key + i++;
    }

    const c = amemo(persistFoo, {
      cacheStore: new FileCacheStore(),
    });
    c("foo");
    c("bar");

    const writeCall = mockFs.writeFileSync.mock.calls[1];
    expect(writeCall).toBeDefined();
    const cacheData = JSON.parse(writeCall[1] as string);
    expect(cacheData['/persistFoo: ["foo"]']).toBeDefined();
    expect(cacheData['/persistFoo: ["bar"]']).toBeDefined();
  });

  it("must work with in-memory cache store for functions", () => {
    let i = 0;
    function memFoo(key: string) {
      return key + i++;
    }

    const cacheStore = new MemCacheStore();
    const c = amemo(memFoo, { cacheStore });

    expect(c("foo")).toBe("foo0");
    expect(c("foo")).toBe("foo0");
    expect(c("bar")).toBe("bar1");
  });

  it("must handle function caching with undefined and null parameters", () => {
    let i = 0;
    function nullableFoo(key?: string | null) {
      return `${key}-${i++}`;
    }

    const c = amemo(nullableFoo);
    expect(c(undefined)).toBe("undefined-0");
    expect(c(undefined)).toBe("undefined-0");
    expect(c(null)).toBe("null-1");
    expect(c(null)).toBe("null-1");
    expect(c("test")).toBe("test-2");
    expect(c("test")).toBe("test-2");
  });
});

it("must handle caching multiple different objects", async () => {
  const obj1 = amemo({
    fn: () => "Foo",
  });
  const obj2 = amemo({
    fn: () => "Bar",
  });
  expect(obj1.fn()).toBe("Foo");
  expect(obj2.fn()).toBe("Bar");

  const objX = {
    fn: () => "Foo",
  };

  const objXM = amemo(objX);
  expect(objXM.fn()).toBe("Foo");
  objX.fn = () => "Bar";
  const objXM2 = amemo(objX);
  expect(objXM.fn()).toBe("Foo");
  expect(objXM2.fn()).toBe("Bar");
});
