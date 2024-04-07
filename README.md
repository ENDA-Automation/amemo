# amemo

**amemo** is a typesafe memoization library for Typescript that wraps your objects and functions with a memoization layer.

## Usage

```typescript
import {cacheProxy} from 'amemo';

const complexType = new ComplexType();
const memoizedType = cacheProxy(complexType);
memoizedType.nested.method({a: 1, b: 2}); // This will be memoized
memoizedType.nested.method({a: 1, b: 2}); // Free real estate
memoizedType.nested.method({a: 1});       // Not memoized
```

### API

Options to configure, if you choose to do so.

```typescript
export type CacheProxyOpts = {
   // Callback when a cache hit occurs
  onHit?: (key: string, args: any[]) => void;

  // Callback when a cache miss occurs
  onMiss?: (key: string, args: any[]) => void;

  // Logger to use, you can just pass console
  // It needs info, warn, error methods.
  logger?: Logger;

  // Default expiration time in milliseconds
  defaultExpire?: number;
  
  // Expiration time per property path
  // i.e. { 'nested.method': 1000 }
  pathExpire?: Record<string, number>;
  
  // Cache store options, see below.
  cacheStoreOpts?: CacheStoreOpts;
};
```

```typescript
export type CacheStoreOpts = {
  // Location of the cache file
  // Path will be recursilvely created if it doesn't exist
  cacheFile?: string; 

  // If false (default) cache will be saved to disk on each set operation
  // and synchronously at that (oh the horror).
  //
  // If true, cache must be save()d manually, otherwise it won't persist.
  //
  // Cache will be attempted to be saved on process.on('exit') as well.
  //
  // When perfroamnce is a concern, this should be set to true (so that
  // each cache set operation is not synchronously written to disk).
  lazy?: boolean; 

  // Logger to use, you can just pass console
  // It needs info, warn, error methods.
  log?: Logger; 
};
```
