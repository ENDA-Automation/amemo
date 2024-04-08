import fs from "fs";
import path from "path";

import { CacheStore, NotFound } from "./cache-store";

type Entry = {
  timestamp: number;
  value: unknown;
};

export type FileCacheStoreOpts = {
  path?: string;
  autoSave?: boolean;
};

export class FileCacheStore implements CacheStore {
  private cache: Record<string, Entry> = {};
  public readonly cacheFile: string;
  private readonly autoSave: boolean;
  constructor(public readonly opts: FileCacheStoreOpts = {}) {
    this.cacheFile = opts.path ?? "cache.json";
    this.autoSave = opts.autoSave ?? true;
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return;
      }
      const data = fs.readFileSync(this.cacheFile, "utf8");
      this.cache = JSON.parse(data);
    } catch (e) {
      // ignore
    }
  }

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
    if (this.autoSave) {
      this.save();
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.cacheFile), { recursive: true });
    fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache));
  }
}
