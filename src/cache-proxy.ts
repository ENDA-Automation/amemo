import { CacheStore, DAY, NotFound } from "./cache-store";
import { FileCacheStore } from "./file-cache-store";

export type CacheProxyOpts = {
  onHit?: (key: string, args: any[]) => void;
  onMiss?: (key: string, args: any[]) => void;
  // Default expiration time in milliseconds
  defaultExpire?: number;
  // Expiration time per property path
  pathExpire?: Record<string, number>;
  cacheStore?: CacheStore;
};

type ProxyCache<T> = Record<string, T>;

function createProxy<T extends object>(
  api: T,
  cache: CacheStore,
  opts: CacheProxyOpts,
  proxyCache: ProxyCache<T>,
  wrapperCache: Record<string, any>,
  path = "",
): T {
  if (proxyCache[path]) {
    return proxyCache[path];
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
        currentPath,
      );
    },
  });
  proxyCache[path] = proxy;
  return proxy;
}

export function cacheProxy<T extends object>(
  api: T,
  opts: CacheProxyOpts = {},
): T {
  const { cacheStore = new FileCacheStore() } = opts;
  return createProxy(api, cacheStore, opts, {}, {});
}
