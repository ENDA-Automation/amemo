import { describe, it, expect } from "@jest/globals";
import { replacer, reviver } from "../src/utils";

describe("utils.ts", () => {
  describe("replacer", () => {
    it("should serialize a Date object", () => {
      const date = new Date("2023-01-01T00:00:00Z");
      expect(replacer("", date)).toEqual({
        __type: "Date",
        value: date.toISOString(),
      });
    });

    it("should serialize a RegExp object", () => {
      const regex = /test/i;
      expect(replacer("", regex)).toEqual({
        __type: "RegExp",
        value: regex.toString(),
      });
    });

    it("should serialize a Set object", () => {
      const set = new Set([1, 2, 3]);
      expect(replacer("", set)).toEqual({
        __type: "Set",
        value: [1, 2, 3],
      });
    });

    it("should serialize a Map object", () => {
      const map = new Map([
        ["key1", "value1"],
        ["key2", "value2"],
      ]);
      expect(replacer("", map)).toEqual({
        __type: "Map",
        value: Array.from(map.entries()),
      });
    });

    it("should serialize a BigInt value", () => {
      const bigIntValue = BigInt(12345678901234567890n);
      expect(replacer("", bigIntValue)).toEqual({
        __type: "BigInt",
        value: bigIntValue.toString(),
      });
    });

    it("should serialize undefined", () => {
      expect(replacer("", undefined)).toEqual({ __type: "undefined" });
    });

    it("should throw an error for a Promise", () => {
      const promise = Promise.resolve();
      expect(() => replacer("", promise)).toThrow(
        "Cannot serialize a Promise directly. Please await it first.",
      );
    });

    it("should serialize an Error object", () => {
      const error = new Error("Test error");
      expect(replacer("", error)).toEqual({
        __type: "Error",
        message: error.message,
        stack: error.stack,
      });
    });

    it("should return the value as-is for unsupported types", () => {
      const value = { key: "value" };
      expect(replacer("", value)).toEqual(value);
    });
  });

  describe("reviver", () => {
    it("should deserialize a Date object", () => {
      const date = new Date("2023-01-01T00:00:00Z");
      expect(
        reviver("", { __type: "Date", value: date.toISOString() }),
      ).toEqual(date);
    });

    it("should deserialize a RegExp object", () => {
      const regex = /test/i;
      expect(
        reviver("", { __type: "RegExp", value: regex.toString() }),
      ).toEqual(regex);
    });

    it("should deserialize a Set object", () => {
      const set = new Set([1, 2, 3]);
      expect(reviver("", { __type: "Set", value: [1, 2, 3] })).toEqual(set);
    });

    it("should deserialize a Map object", () => {
      const map = new Map([
        ["key1", "value1"],
        ["key2", "value2"],
      ]);
      expect(
        reviver("", { __type: "Map", value: Array.from(map.entries()) }),
      ).toEqual(map);
    });

    it("should deserialize a BigInt value", () => {
      const bigIntValue = BigInt(12345678901234567890n);
      expect(
        reviver("", { __type: "BigInt", value: bigIntValue.toString() }),
      ).toEqual(bigIntValue);
    });

    it("should deserialize undefined", () => {
      expect(reviver("", { __type: "undefined" })).toBeUndefined();
    });

    it("should deserialize an Error object", () => {
      const error = { __type: "Error", message: "Test error", stack: "stack" };
      const deserializedError = reviver("", error);
      expect(deserializedError).toBeInstanceOf(Error);
      expect(deserializedError.message).toBe(error.message);
      expect(deserializedError.stack).toBe(error.stack);
    });

    it("should return the value as-is for unsupported types", () => {
      const value = { key: "value" };
      expect(reviver("", value)).toEqual(value);
    });
  });
});
