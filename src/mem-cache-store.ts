import { CacheStore, Entry, NotFound } from "./cache-store";

export class MemCacheStore implements CacheStore {
  constructor(protected cache: Record<string, Entry> = {}) {}

  get(key: string, expire: number, purge = true) {
    const entry = this.cache[key];
    if (!entry) {
      return NotFound;
    }
    const elapsed = Date.now() - entry.timestamp;
    if (elapsed >= expire) {
      if (purge) {
        delete this.cache[key];
      }
      return NotFound;
    }
    if (entry.promise) {
      if (entry.rejected) {
        return Promise.reject(entry.value);
      }
      return Promise.resolve(entry.value);
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

  purge(expire: number) {
    let count = 0;
    const now = Date.now();
    for (const key in this.cache) {
      const entry = this.cache[key];
      const elapsed = now - entry.timestamp;
      if (elapsed >= expire) {
        count++;
        delete this.cache[key];
      }
    }
    return count;
  }
}
