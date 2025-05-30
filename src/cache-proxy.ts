import { CacheStore, DAY, NotFound } from "./cache-store";

export type CacheProxyOpts = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onHit?: (key: string, args: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMiss?: (key: string, args: any[]) => void;
  // Default expiration time in milliseconds
  defaultExpire?: number;
  // Expiration time per property path
  pathExpire?: Record<string, number>;
  cacheStore?: CacheStore;
};

type ProxyCache<T> = Record<string, T>;

export type Fn = (...args: unknown[]) => unknown;
export type Class = new (...args: unknown[]) => unknown;
export type Memoizable = object | Fn | Class;

export function createProxy<T extends Memoizable>(
  api: T,
  cache: CacheStore,
  opts: CacheProxyOpts,
  proxyCache: ProxyCache<T>,
  wrapperCache: Record<string, unknown>,
  path = "",
): T {
  if (proxyCache[path]) {
    return proxyCache[path];
  }

  if (typeof api === "function") {
    const currentPath = path + "/" + api.name;
    const wrapped = (...args: unknown[]): unknown => {
      const key =
        currentPath +
        ": " +
        JSON.stringify(
          args.map((a) => {
            if (a === undefined) return "undefined";
            if (a === null) return "null";
            return a;
          }),
        );
      const cached = cache.get(key, opts.defaultExpire ?? 1 * DAY);
      if (cached !== NotFound) {
        opts.onHit?.(key, args);
        return cached;
      }

      const result = (api as Fn)(...args);
      cache.set(key, result);
      opts.onMiss?.(key, args);
      return result;
    };
    proxyCache[path] = wrapped as T;
    return wrapped as T;
  }

  const proxy = new Proxy(api, {
    get(target, prop /*, receiver*/) {
      const currentPath = path + "/" + prop.toString();
      const p = target[prop as keyof T];
      if (typeof p === "function") {
        if (wrapperCache[currentPath]) {
          return wrapperCache[currentPath];
        }
        const bound = p.bind(target);
        const {
          defaultExpire = 1 * DAY,
          pathExpire = {},
          onHit = () => {},
          onMiss = () => {},
        } = opts;
        const expire = pathExpire[currentPath] ?? defaultExpire;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wrapped = function (...args: any[]) {
          const key = currentPath + ": " + JSON.stringify(args);
          const cached = cache.get(key, expire);
          if (cached !== NotFound) {
            onHit(key, args);
            return cached;
          }

          const result = bound(...args);
          cache.set(key, result);
          onMiss(key, args);
          return result;
        };
        wrapperCache[currentPath] = wrapped;
        return wrapped;
      }

      if (!(p instanceof Object)) {
        return p;
      }
      return createProxy(
        target[prop as keyof T] as object,
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
