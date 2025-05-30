import { CacheProxyOpts, createProxy, Memoizable } from "./cache-proxy";
import { MemCacheStore } from "./mem-cache-store";

export function amemo<T extends Memoizable>(
  api: T,
  opts: CacheProxyOpts = {},
): T {
  const { cacheStore = new MemCacheStore() } = opts;
  return createProxy(api, cacheStore, opts, {}, {});
}

export * from "./cache-store";
export * from "./mem-cache-store";
export * from "./file-cache-store";
export * from "./cache-proxy";
