import fs from "fs";
import path from "path";
import { Logger } from "./log";

type Entry = {
  timestamp: number;
  value: unknown;
};

export type CacheStoreOpts = {
  cacheFile?: string;
  lazy?: boolean;
  log?: Logger;
};

export const NotFound = Symbol("NotFound");

export class CacheStore {
  private cache: Record<string, Entry> = {};
  public readonly cacheFile: string;
  public readonly lazy: boolean;
  constructor(public readonly opts: CacheStoreOpts = {}) {
    this.cacheFile = opts.cacheFile ?? "cache.json";
    this.lazy = opts.lazy ?? false;
    try {
      if (!fs.existsSync(this.cacheFile)) {
        opts.log?.warn?.(`Empty cache`);
        return;
      }
      this.cache = JSON.parse(fs.readFileSync(this.cacheFile, "utf-8"));

      if (this.lazy) {
        process.on("exit", () => {
          this.save();
        });
      }
      opts.log?.info?.(
        `Cache loaded with ${Object.keys(this.cache).length} entries`
      );
    } catch (e) {
      opts.log?.error?.(`Corrupt cache file ${this.cacheFile}, ignoring it`);
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
    if (!this.opts.lazy) {
      this.save();
    }
  }

  save() {
    this.opts.log?.info?.("[cache] saving");
    fs.mkdirSync(path.dirname(this.cacheFile), { recursive: true });
    fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache)); // async?
  }

  [Symbol.dispose]() {
    this.save(); // async dispose?
  }
}

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

export type CacheProxyOpts = {
  onHit?: (key: string, args: any[]) => void;
  onMiss?: (key: string, args: any[]) => void;
  logger?: Logger;
  // Default expiration time in milliseconds
  defaultExpire?: number;
  // Expiration time per property path
  pathExpire?: Record<string, number>;
  cacheStoreOpts?: CacheStoreOpts;
};

type ProxyCache<T> = Record<string, T>;

function createProxy<T extends object>(
  api: T,
  cache: CacheStore,
  opts: CacheProxyOpts,
  proxyCache: ProxyCache<T>,
  wrapperCache: Record<string, any>,
  path = ""
): T {
  if (proxyCache[path]) {
    return proxyCache[path];
  }

  if (typeof api !== "object") {
    return api;
  }

  const proxy = new Proxy(api, {
    get(target, prop /*, receiver*/) {
      const currentPath = path + "/" + prop.toString();
      const p = target[prop as keyof T];
      if (typeof p === "function") {
        if (wrapperCache[currentPath]) {
          return wrapperCache[currentPath];
        }
        const binded = p.bind(target);
        const {
          defaultExpire = 1 * DAY,
          pathExpire = {},
          onHit = () => {},
          onMiss = () => {},
        } = opts;
        const expire = pathExpire[currentPath] ?? defaultExpire;
        const wrapped = function (...args: any[]) {
          const key = currentPath + ": " + JSON.stringify(args);
          const cached = cache.get(key, expire);
          if (cached !== NotFound) {
            onHit(key, args);
            return cached;
          }

          const result = binded(...args);
          cache.set(key, result);
          onMiss(key, args);
          return result;
        };
        wrapperCache[currentPath] = wrapped;
        return wrapped;
      }
      return createProxy(
        target[prop as keyof T] as any,
        cache,
        opts,
        proxyCache,
        wrapperCache,
        currentPath
      );
    },
  });
  proxyCache[path] = proxy;
  return proxy;
}

export function cacheProxy<T extends object>(
  api: T,
  opts: CacheProxyOpts = {}
): T {
  const cache = new CacheStore(opts.cacheStoreOpts);
  return createProxy(api, cache, opts, {}, {});
}
