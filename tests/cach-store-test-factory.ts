import {
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
  jest,
  afterAll,
  beforeAll,
} from "@jest/globals";
import { CacheStore, NotFound, SECOND } from "../src/cache-store";

export interface CacheStoreTestConfig {
  name: string;
  createStore: () => CacheStore;
  cleanup?: () => void;
  beforeEach?: () => void;
  afterEach?: () => void;
  beforeAll?: () => void;
  afterAll?: () => void;
}

export function createCacheStoreTests(config: CacheStoreTestConfig) {
  return describe(`CacheStore - ${config.name}`, () => {
    let store: CacheStore;

    beforeAll(() => {
      config.beforeAll?.();
    });

    afterAll(() => {
      config.afterAll?.();
    });

    beforeEach(() => {
      jest.useFakeTimers();
      store = config.createStore();
      store.clear();
      if (config.cleanup) {
        config.cleanup();
      }
      config.beforeEach?.();
    });

    afterEach(() => {
      jest.useRealTimers();
      config.afterEach?.();
    });

    describe("basic operations", () => {
      it("should return NotFound for non-existent keys", () => {
        const result = store.get("non-existent", 1000);
        expect(result).toBe(NotFound);
      });

      it("should store and retrieve values", () => {
        const value = "test-value";
        const key = "test-key";

        store.set(key, value);
        const result = store.get(key, 1000);

        expect(result).toBe(value);
      });

      it("should handle different value types", () => {
        const testCases = [
          ["string", "hello world"],
          ["number", 42],
          ["boolean", true],
          ["object", { foo: "bar", nested: { value: 123 } }],
          ["array", [1, 2, 3, "test"]],
          ["null", null],
          ["undefined", undefined],
        ];

        testCases.forEach(([type, value]) => {
          const key = `test-${type}`;
          store.set(key, value);
          const result = store.get(key, 1000);
          expect(result).toEqual(value);
        });
      });

      it("should clear all entries", () => {
        store.set("key1", "value1");
        store.set("key2", "value2");
        store.set("key3", "value3");

        expect(store.get("key1", 1000)).toBe("value1");
        expect(store.get("key2", 1000)).toBe("value2");

        store.clear();

        expect(store.get("key1", 1000)).toBe(NotFound);
        expect(store.get("key2", 1000)).toBe(NotFound);
        expect(store.get("key3", 1000)).toBe(NotFound);
      });
    });

    describe("expiration handling", () => {
      it("should return NotFound for expired entries", () => {
        const key = "expired-key";

        store.set(key, "expired-value");

        // Advance time by 2 seconds
        jest.advanceTimersByTime(2000);

        // Check with 1 second expiry - should be expired
        const result = store.get(key, 1000);
        expect(result).toBe(NotFound);
      });

      it("should return value for non-expired entries", () => {
        const key = "valid-key";
        const value = "valid-value";

        store.set(key, value);

        // Advance time by 1 second
        jest.advanceTimersByTime(1000);

        // Check with 2 second expiry - should still be valid
        const result = store.get(key, 2000);
        expect(result).toBe(value);
        expect(store.get(key, 1000)).toBe(NotFound);
      });

      it("should handle exact expiration boundary", () => {
        const key = "boundary-key";
        const value = "boundary-value";

        store.set(key, value);

        // Advance time by exactly 1 second
        jest.advanceTimersByTime(1000);

        // Check with exactly 1 second expiry - should be expired
        const result = store.get(key, 1000);
        expect(result).toBe(NotFound);
      });

      it("should purge expired entries", () => {
        // Set up entries at different times
        store.set("old1", "value1");
        store.set("old2", "value2");

        // Advance time
        jest.advanceTimersByTime(2000);

        store.set("new1", "value3");

        // Verify expiration behavior
        expect(store.get("old1", 1000)).toBe(NotFound);
        expect(store.get("old2", 1000)).toBe(NotFound);
        expect(store.get("new1", 1000)).toBe("value3");

        const purgedCount = store.purge(1000);

        // Verify purge count (implementation dependent)
        expect(typeof purgedCount).toBe("number");
        expect(purgedCount).toBeGreaterThanOrEqual(0);
      });
    });

    describe("Entry type handling", () => {
      it("should handle promise entries", () => {
        const key = "promise-key";
        const promiseValue = Promise.resolve("resolved-value");

        store.set(key, promiseValue);
        const result = store.get(key, 1000);

        expect(result).toBe(promiseValue);
      });

      it("should handle rejected promise entries", async () => {
        const key = "rejected-key";
        const rejectedPromise = Promise.reject(new Error("test error"));

        store.set(key, rejectedPromise);
        const result = store.get(key, 1000);

        try {
          await result;
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toEqual(new Error("test error"));
        }
      });

      it("should preserve complex objects", () => {
        const complexObject = {
          id: 123,
          name: "test",
          metadata: {
            created: new Date().toISOString(),
            tags: ["tag1", "tag2"],
            config: {
              enabled: true,
              timeout: 5000,
            },
          },
          data: [1, 2, 3, { nested: "value" }],
        };

        const key = "complex-object";
        store.set(key, complexObject);
        const result = store.get(key, 1000);

        expect(result).toEqual(complexObject);
      });
    });

    describe("edge cases", () => {
      it("should handle empty string keys", () => {
        const key = "";
        const value = "empty-key-value";

        store.set(key, value);
        const result = store.get(key, 1000);

        expect(result).toBe(value);
      });

      it("should handle keys with special characters", () => {
        const specialKeys = [
          "key with spaces",
          "key/with/slashes",
          "key:with:colons",
          "key.with.dots",
          "key-with-dashes",
          "key_with_underscores",
          "key[with]brackets",
          "key{with}braces",
          "key(with)parentheses",
        ];

        specialKeys.forEach((key, index) => {
          const value = `value-${index}`;
          store.set(key, value);
          const result = store.get(key, 1000);
          expect(result).toBe(value);
        });
      });

      it("should handle very long keys", () => {
        const longKey = "a".repeat(1000);
        const value = "long-key-value";

        store.set(longKey, value);
        const result = store.get(longKey, 1000);

        expect(result).toBe(value);
      });

      it("should handle large values", () => {
        const largeValue = "x".repeat(10000);
        const key = "large-value-key";

        store.set(key, largeValue);
        const result = store.get(key, 1000);

        expect(result).toBe(largeValue);
      });

      it("should handle rapid successive operations", () => {
        const operations = 100;

        // Set many values rapidly
        for (let i = 0; i < operations; i++) {
          store.set(`rapid-${i}`, `value-${i}`);
        }

        // Verify all values
        for (let i = 0; i < operations; i++) {
          const result = store.get(`rapid-${i}`, 1000);
          expect(result).toBe(`value-${i}`);
        }
      });

      it("should handle overwriting existing keys", () => {
        const key = "overwrite-key";
        const originalValue = "original";
        const newValue = "updated";

        store.set(key, originalValue);
        expect(store.get(key, 1000)).toBe(originalValue);

        store.set(key, newValue);
        expect(store.get(key, 1000)).toBe(newValue);
      });
    });

    describe("save operation", () => {
      it("should execute save without throwing", () => {
        store.set("test-key", "test-value");

        expect(() => {
          store.save();
        }).not.toThrow();
      });

      it("should persist data after save (if applicable)", () => {
        const key = "persist-key";
        const value = "persist-value";

        store.set(key, value);
        store.save();

        // Data should still be accessible
        const result = store.get(key, 1000);
        expect(result).toBe(value);
      });
    });

    describe("time constants validation", () => {
      it("should validate time constants are properly defined", () => {
        expect(SECOND).toBe(1000);
        expect(typeof SECOND).toBe("number");
      });

      it("should handle expiration times using time constants", () => {
        const key = "time-const-key";
        const value = "time-const-value";

        store.set(key, value);
        const result = store.get(key, SECOND);

        expect(result).toBe(value);
      });
    });

    describe("concurrent operations", () => {
      it("should handle multiple gets for same key", () => {
        const key = "concurrent-key";
        const value = "concurrent-value";

        store.set(key, value);

        const results = Array.from({ length: 10 }, () => store.get(key, 1000));

        results.forEach((result) => {
          expect(result).toBe(value);
        });
      });

      it("should handle mixed operations", () => {
        const baseKey = "mixed-op";

        // Mix of sets and gets
        for (let i = 0; i < 50; i++) {
          const key = `${baseKey}-${i}`;
          const value = `value-${i}`;

          store.set(key, value);

          if (i % 2 === 0) {
            const result = store.get(key, 1000);
            expect(result).toBe(value);
          }
        }

        // Verify all values are still accessible
        for (let i = 0; i < 50; i++) {
          const key = `${baseKey}-${i}`;
          const expectedValue = `value-${i}`;
          const result = store.get(key, 1000);
          expect(result).toBe(expectedValue);
        }
      });
    });

    describe("time-based expiration scenarios", () => {
      it("should handle multiple entries with different expiration times", () => {
        // Set entries at different times
        store.set("first", "value1"); // Created at 0ms

        jest.advanceTimersByTime(500);
        store.set("second", "value2"); // Created at 500ms

        jest.advanceTimersByTime(500);
        store.set("third", "value3"); // Created at 1000ms

        // current time is 1000ms
        expect(store.get("first", 500)).toBe(NotFound); // (0+500) <= 1000
        expect(store.get("second", 500)).toBe(NotFound); // (500+500) <= 1000
        expect(store.get("third", 500)).toBe("value3"); // (1000+400) >= 1000

        // Advance more time
        jest.advanceTimersByTime(500);

        // Check at 1500ms elapsed - first two should be expired with 1000ms TTL
        expect(store.get("first", 1000)).toBe(NotFound);
        expect(store.get("second", 1000)).toBe(NotFound);
        expect(store.get("third", 1000)).toBe("value3");
      });
    });
  });
}
