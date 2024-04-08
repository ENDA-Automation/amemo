// src/cache-store.ts
var NotFound = Symbol("NotFound");
var SECOND = 1e3;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;
var DAY = 24 * HOUR;
var WEEK = 7 * DAY;

// src/file-cache-store.ts
import fs from "fs";
import path from "path";
var FileCacheStore = class {
  constructor(opts = {}) {
    this.opts = opts;
    this.cache = {};
    this.cacheFile = opts.path ?? "cache.json";
    this.autoSave = opts.autoSave ?? true;
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return;
      }
      const data = fs.readFileSync(this.cacheFile, "utf8");
      this.cache = JSON.parse(data);
    } catch (e) {
    }
  }
  get(key, expire) {
    const entry = this.cache[key];
    if (!entry) {
      return NotFound;
    }
    if (Date.now() - entry.timestamp > expire) {
      return NotFound;
    }
    return entry.value;
  }
  set(key, value) {
    this.cache[key] = {
      timestamp: Date.now(),
      value
    };
    if (this.autoSave) {
      this.save();
    }
  }
  save() {
    fs.mkdirSync(path.dirname(this.cacheFile), { recursive: true });
    fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache));
  }
};

// src/cacheProxy.ts
function createProxy(api, cache, opts, proxyCache, wrapperCache, path2 = "") {
  if (proxyCache[path2]) {
    return proxyCache[path2];
  }
  const proxy = new Proxy(api, {
    get(target, prop) {
      const currentPath = path2 + "/" + prop.toString();
      const p = target[prop];
      if (typeof p === "function") {
        if (wrapperCache[currentPath]) {
          return wrapperCache[currentPath];
        }
        const binded = p.bind(target);
        const {
          defaultExpire = 1 * DAY,
          pathExpire = {},
          onHit = () => {
          },
          onMiss = () => {
          }
        } = opts;
        const expire = pathExpire[currentPath] ?? defaultExpire;
        const wrapped = function(...args) {
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
        target[prop],
        cache,
        opts,
        proxyCache,
        wrapperCache,
        currentPath
      );
    }
  });
  proxyCache[path2] = proxy;
  return proxy;
}
function cacheProxy(api, opts = {}) {
  const { cacheStore = new FileCacheStore() } = opts;
  return createProxy(api, cacheStore, opts, {}, {});
}
export {
  cacheProxy
};
//# sourceMappingURL=index.js.map
