declare module "cache-store" {
    export interface CacheStore {
        get(key: string, expire: number): unknown;
        set(key: string, value: unknown): void;
        save(): void;
    }
    export type Entry = {
        timestamp: number;
        value: unknown;
    };
    export const NotFound: unique symbol;
    export const SECOND = 1000;
    export const MINUTE: number;
    export const HOUR: number;
    export const DAY: number;
    export const WEEK: number;
}
declare module "mem-cache-store" {
    import { CacheStore, Entry } from "cache-store";
    export class MemCacheStore implements CacheStore {
        protected cache: Record<string, Entry>;
        constructor(cache?: Record<string, Entry>);
        get(key: string, expire: number): unknown;
        set(key: string, value: unknown): void;
        save(): void;
    }
}
declare module "file-cache-store" {
    import { MemCacheStore } from "mem-cache-store";
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
    }
}
declare module "cache-proxy" {
    import { CacheStore } from "cache-store";
    export type CacheProxyOpts = {
        onHit?: (key: string, args: any[]) => void;
        onMiss?: (key: string, args: any[]) => void;
        defaultExpire?: number;
        pathExpire?: Record<string, number>;
        cacheStore?: CacheStore;
    };
    type ProxyCache<T> = Record<string, T>;
    export function createProxy<T extends object>(api: T, cache: CacheStore, opts: CacheProxyOpts, proxyCache: ProxyCache<T>, wrapperCache: Record<string, unknown>, path?: string): T;
}
declare module "amemo" {
    import { CacheProxyOpts } from "cache-proxy";
    export function amemo<T extends object>(api: T, opts?: CacheProxyOpts): T;
    export * from "cache-store";
    export * from "mem-cache-store";
    export * from "file-cache-store";
    export * from "cache-proxy";
}
