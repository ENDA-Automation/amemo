export function replacer(key: string, value: any) {
  if (value instanceof Date)
    return { __type: "Date", value: value.toISOString() };
  if (value instanceof RegExp)
    return { __type: "RegExp", value: value.toString() };
  if (value instanceof Set) return { __type: "Set", value: Array.from(value) };
  if (value instanceof Map)
    return { __type: "Map", value: Array.from(value.entries()) };
  if (typeof value === "bigint")
    return { __type: "BigInt", value: value.toString() };
  if (value === undefined) return { __type: "undefined" };
  if (value instanceof Promise) {
    // it would have been better if we could serialize the promise
    // replacer is synchronous, so we cannot await the promise here
    // it is handled in file-cache-store.ts and mem-cache-store.ts
    throw new Error(
      "Cannot serialize a Promise directly. Please await it first.",
    );
  }
  if (value instanceof Error) {
    return { __type: "Error", message: value.message, stack: value.stack };
  }
  return value;
}

export function reviver(key: string, value: any) {
  if (value && typeof value === "object" && value.__type) {
    switch (value.__type) {
      case "Date":
        return new Date(value.value);
      case "RegExp": {
        const match = value.value.match(/^\/(.*)\/([a-z]*)$/);
        if (match) {
          return new RegExp(match[1], match[2]);
        }
        throw new Error("Invalid RegExp format");
      }
      case "Set":
        return new Set(value.value);
      case "Map":
        return new Map(value.value);
      case "BigInt":
        return BigInt(value.value);
      case "undefined":
        return undefined;
      case "Error": {
        const error = new Error(value.message);
        error.stack = value.stack;
        return error;
      }
    }
  }
  return value;
}
