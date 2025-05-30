import { CacheStore, Entry, NotFound } from "./cache-store";

export class MemCacheStore implements CacheStore {
  constructor(protected cache: Record<string, Entry> = {}) {}

  get(key: string, expire: number) {
    const entry = this.cache[key];
    if (!entry) {
      return NotFound;
    }
    if (Date.now() - entry.timestamp > expire) {
      return NotFound;
    }
    return entry.value;
  }

  set(key: string, value: unknown) {
    this.cache[key] = {
      timestamp: Date.now(),
      value,
    };
  }

  save() {}

  clear() {
    this.cache = {};
  }
}
