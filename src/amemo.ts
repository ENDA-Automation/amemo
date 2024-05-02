import { CacheProxyOpts, createProxy } from "./cache-proxy";
import { FileCacheStore } from "./file-cache-store";

export function amemo<T extends object>(api: T, opts: CacheProxyOpts = {}): T {
  const { cacheStore = new FileCacheStore() } = opts;
  return createProxy(api, cacheStore, opts, {}, {});
}

export * from "./cache-store";
export * from "./mem-cache-store";
export * from "./file-cache-store";
export * from "./cache-proxy";
