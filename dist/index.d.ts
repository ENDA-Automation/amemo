declare module "src/cache-store" {
    export abstract class CacheStore {
        abstract get(key: string, expire: number): unknown;
        abstract set(key: string, value: unknown): void;
        abstract save(): void;
        abstract clear(): void;
        abstract purge(expire: number): number;
    }
    export type Entry = {
        timestamp: number;
        value: unknown;
        promise?: boolean;
        rejected?: boolean;
    };
    export const NotFound: unique symbol;
    export const SECOND = 1000;
    export const MINUTE: number;
    export const HOUR: number;
    export const DAY: number;
    export const WEEK: number;
}
declare module "src/cache-proxy" {
    import { CacheStore } from "src/cache-store";
    export type CacheProxyOpts = {
        onHit?: (key: string, args: any[]) => void;
        onMiss?: (key: string, args: any[]) => void;
        defaultExpire?: number;
        pathExpire?: Record<string, number>;
        cacheStore?: CacheStore;
    };
    type ProxyCache<T> = Record<string, T>;
    export type Fn = (...args: unknown[]) => unknown;
    export type Class = new (...args: unknown[]) => unknown;
    export type Memoizable = object | Fn | Class;
    export function createProxy<T extends Memoizable>(api: T, cache: CacheStore, opts: CacheProxyOpts, proxyCache: ProxyCache<T>, wrapperCache: Record<string, unknown>, path?: string): T;
}
declare module "src/mem-cache-store" {
    import { CacheStore, Entry } from "src/cache-store";
    export class MemCacheStore implements CacheStore {
        protected cache: Record<string, Entry>;
        constructor(cache?: Record<string, Entry>);
        get(key: string, expire: number, purge?: boolean): unknown;
        set(key: string, value: unknown): void;
        save(): void;
        clear(): void;
        purge(expire: number): number;
    }
}
declare module "src/amemo.browser" {
    import { CacheProxyOpts, Memoizable } from "src/cache-proxy";
    export function amemo<T extends Memoizable>(api: T, opts?: CacheProxyOpts): T;
    export * from "src/cache-store";
    export * from "src/mem-cache-store";
    export * from "src/cache-proxy";
}
declare module "src/utils" {
    export function replacer(key: string, value: unknown): {} | null;
    export function reviver(key: string, value: any): any;
}
declare module "src/file-cache-store" {
    import { MemCacheStore } from "src/mem-cache-store";
    export type FileCacheStoreOpts = {
        path?: string;
        autoSave?: boolean;
    };
    export class FileCacheStore extends MemCacheStore {
        readonly opts: FileCacheStoreOpts;
        readonly cacheFile: string;
        private readonly autoSave;
        constructor(opts?: FileCacheStoreOpts);
        set(key: string, value: unknown): void;
        save(): Promise<void>;
        clear(): void;
    }
}
declare module "src/amemo.node" {
    import { CacheProxyOpts, Memoizable } from "src/cache-proxy";
    export function amemo<T extends Memoizable>(api: T, opts?: CacheProxyOpts): T;
    export * from "src/cache-store";
    export * from "src/mem-cache-store";
    export * from "src/file-cache-store";
    export * from "src/cache-proxy";
}
declare module "src/amemo" {
    export * from "src/cache-store";
    export * from "src/mem-cache-store";
    export * from "src/file-cache-store";
    export * from "src/cache-proxy";
    export * from "src/amemo.node";
}
declare module "src/indexeddb-store" {
    import { CacheStore } from "src/cache-store";
    export class MinimalKVStore extends CacheStore {
        private dbName;
        private storeName;
        constructor(dbName?: string, storeName?: string);
        private init;
        private transaction;
        set<T>(key: string, value: T): Promise<void>;
        get<T>(key: string): Promise<T | undefined>;
        delete(key: string): Promise<void>;
        clear(): Promise<void>;
        purge(expire: number): number;
        save(): void;
    }
}
declare module "tests/cacheProxy.test" { }
declare module "tests/utils.test" { }
