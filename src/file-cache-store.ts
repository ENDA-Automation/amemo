import * as fs from "fs";
import * as path from "path";

import { MemCacheStore } from "./mem-cache-store";
import { replacer, reviver } from "./utils";

export type FileCacheStoreOpts = {
  path?: string;
  autoSave?: boolean;
};

export class FileCacheStore extends MemCacheStore {
  public readonly cacheFile: string;
  private readonly autoSave: boolean;
  constructor(public readonly opts: FileCacheStoreOpts = {}) {
    super();
    this.cacheFile = opts.path ?? ".amemo.json";
    this.autoSave = opts.autoSave ?? true;
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return;
      }
      const data = fs.readFileSync(this.cacheFile, "utf8");
      super.cache = JSON.parse(data, reviver);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // ignore
    }
  }

  set(key: string, value: unknown) {
    super.set(key, value);
    if (this.autoSave) {
      this.save();
    }
  }

  async save() {
    for (const [key, entry] of Object.entries(this.cache)) {
      if (entry.value instanceof Promise) {
        this.cache[key].promise = true;
        try {
          this.cache[key].value = await entry.value;
        } catch (e) {
          // Error object is not serializable, so we just remove it
          this.cache[key].value = e;
          this.cache[key].rejected = true;
        }
      }
    }

    fs.mkdirSync(path.dirname(this.cacheFile), { recursive: true });
    fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, replacer));
  }

  clear() {
    super.clear();
    fs.unlinkSync(this.cacheFile);
  }
}
