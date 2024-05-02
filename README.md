<img src="badges/coverage.svg" alt="Test coverage score"/>

# amemo

**amemo** is an experimental drop-in, type safe, persistent (or not), zero-dependency memoization library.

It could be used to save time and resources by caching the results of expensive function calls, such as paid or rate limited API calls.

An in memory cache is also provided for non-persistent caching for environments where fs is not available.

## Usage

```typescript
import {amemo} from 'amemo';

const complexType = new ComplexType();
const memoizedType = amemo(complexType); // drop-in replacement
memoizedType.nested.method({a: 1, b: 2}); // This will be memoized
memoizedType.nested.method({a: 1, b: 2}); // Free real estate
memoizedType.nested.method({a: 1});       // Not **memoized**
```

## API

Options to configure, if you choose to do so.

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
  // Path will be recursively created if it doesn't exist
  // Default: './.amemo.json'
  path?: string; 

  // If True the cache will be written to disk on every cache miss.
  // If False the cache will be written manually by calling the save method.
  // Default: true
  autoSave?: boolean;
};
```

## Performance

By default the library aims to be extremely easy to use and requires no configuration. It can be used as a drop in replacement for easy gains.

And it must be just fine for most use cases. However, if you are looking for more performance, you can configure the cache store to use a more performant cache store.

### FileCacheStore

#### Constructor

Reads and parses the cache file synchronously (once).

#### set

Writes to the cache file synchronously when autoSave is true. Otherwise, save() method must be called by user to actually commit the cache to the disk. If not, cache store will act like an in-memory cache.

#### autoSave

```typescript
import {amemo, FileCacheStore} from 'amemo';

const cacheStore = new FileCacheStore({autoSave: false});
const complexType = new ComplexType();
const memoizedType = amemo(complexType, {cacheStore}); // drop-in replacement
memoizedType.nested.method({a: 1, b: 2}); // This will be memoized
memoizedType.nested.method({a: 1, b: 2}); // Free real estate
memoizedType.nested.method({a: 1});       // Not **memoized**

// Save the cache to the disk
cacheStore.save(); // <-- Commit the cache to the disk, otherwise store will act like a in-memory cache
```

#### MemCacheStore

You can also use an in-memory for non persistent caching.

```typescript
import {amemo, MemCacheStorage} from 'amemo';

const cacheStore = new MemCacheStorage();
const complexType = new ComplexType();
const memoizedType = amemo(complexType, {cacheStore}); // drop-in replacement
memoizedType.nested.method({a: 1, b: 2}); // This will be memoized
memoizedType.nested.method({a: 1, b: 2}); // Free real estate
```

### Alternative implementations

Alternative implementation, say a browser compatible interface like LocalStorage or IndexedDB , can be implemented by implementing the CacheStore interface.

```typescript
export interface CacheStore {
  get(key: string, expire: number): unknown;
  set(key: string, value: unknown): void;
  save(): void;
}
```
