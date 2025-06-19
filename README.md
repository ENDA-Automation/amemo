<img src="badges/coverage.svg" alt="Test coverage score"/>

# amemo

**amemo** is an experimental drop-in, type-safe, persistent (or not), zero-dependency memoization library.

It can be used to save time and resources by caching the results of expensive function calls, paid or rate-limited API calls.

It is designed to work with deeply nested objecst such as API SDKs, sync or async methods.

An in-memory cache is also provided for non-persistent caching in environments where the file system is not available.

It works in both Node.js and browser environments, but FileCacheStore is only available in Node.js. In browser environments, you can use MemCacheStore or implement your own CacheStore interface. When MemCacheStore is used, the cache will not be persistent and will be lost when the page is reloaded.

> [!WARNING]
> If the function being cached has side effects (i.e., it modifies an input object), these side effects won't run when the function result is served from cache.

## Usage

```typescript
import {amemo} from 'amemo';

const complexType = new ComplexType();
const memoizedType = amemo(complexType); // drop-in replacement
memoizedType.nested.method({a: 1, b: 2}); // This will be memoized
memoizedType.nested.method({a: 1, b: 2}); // Cache hit - no execution
memoizedType.nested.method({a: 1});       // Different arguments - not cached
```

## API

Configuration options, if you choose to customize the behavior:

```typescript
export type CacheProxyOpts = {
   // Callback when a cache hit occurs
  onHit?: (key: string, args: any[]) => void;

  // Callback when a cache miss occurs
  onMiss?: (key: string, args: any[]) => void;

  // Default expiration time in milliseconds
  // Default: 1 * DAY
  defaultExpire?: number;
  
  // Expiration time per property path
  // i.e. { 'nested.method': 1000 }
  pathExpire?: Record<string, number>;
  
  // Cache store. See below for more information.
  // default: new FileCacheStore()
  cacheStore?: CacheStore;
};
```

```typescript
export type FileCacheStoreOpts = {
  // Location of the cache file
  // Directory will be created recursively if it doesn't exist
  // Default: './.amemo.json'
  path?: string; 

  // If true, the cache will be written to disk on every cache miss
  // If false, the cache must be saved manually by calling the save() method
  // Default: true
  autoSave?: boolean;
};
```

## Performance

By default, the library aims to be extremely easy to use and requires no configuration. It can be used as a drop-in replacement for easy performance gains.

It should be sufficient for most use cases, given that cached operations inherently  take long time, the caching mechanism cost should be negligible. However, if you need more performance, you can configure the cache store to use a more performant implementation.

### FileCacheStore

> [!WARNING]
> FileCacheStore tries to resolve all cached results that are promises.
>
> TODO: Add a timeout option
>
> If that proves to be a problem, turning auto save off might help.

#### Constructor

Reads and parses the cache file synchronously (once during initialization).

#### set

Writes to the cache file synchronously when autoSave is true. Otherwise, the save() method must be called manually to commit the cache to disk. If not called, the cache store will act like an in-memory cache.

#### autoSave

```typescript
import {amemo, FileCacheStore} from 'amemo';

const cacheStore = new FileCacheStore({autoSave: false});
const complexType = new ComplexType();
const memoizedType = amemo(complexType, {cacheStore});
memoizedType.nested.method({a: 1, b: 2}); // This will be memoized
memoizedType.nested.method({a: 1, b: 2}); // Cache hit - no execution
memoizedType.nested.method({a: 1});       // Different arguments - not cached

// Manually save the cache to disk
cacheStore.save(); // Commit the cache to disk, otherwise it acts like in-memory cache
```

#### MemCacheStore

You can also use an in-memory store for non-persistent caching:

```typescript
import {amemo, MemCacheStore} from 'amemo';

const cacheStore = new MemCacheStore();
const complexType = new ComplexType();
const memoizedType = amemo(complexType, {cacheStore});
memoizedType.nested.method({a: 1, b: 2}); // This will be memoized
memoizedType.nested.method({a: 1, b: 2}); // Cache hit - no execution
```

### Alternative implementations

Alternative implementations, such as browser-compatible interfaces like LocalStorage or IndexedDB, can be created by implementing the CacheStore interface:

```typescript
export interface CacheStore {
  get(key: string, expire: number): unknown;
  set(key: string, value: unknown): void;
  save(): void;
}
```
