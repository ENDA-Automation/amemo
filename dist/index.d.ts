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
declare module "file-cache-store" {
    import { CacheStore } from "cache-store";
    export type FileCacheStoreOpts = {
        path?: string;
        autoSave?: boolean;
    };
    export class FileCacheStore implements CacheStore {
        readonly opts: FileCacheStoreOpts;
        private cache;
        readonly cacheFile: string;
        private readonly autoSave;
        constructor(opts?: FileCacheStoreOpts);
        get(key: string, expire: number): unknown;
        set(key: string, value: unknown): void;
        save(): void;
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
    export function cacheProxy<T extends object>(api: T, opts?: CacheProxyOpts): T;
}
declare module "amemo" {
    export * from "cache-store";
    export * from "file-cache-store";
    export * from "cache-proxy";
}
declare module "mem-cache-store" {
    import { CacheStore, Entry } from "cache-store";
    export class MemCacheStore implements CacheStore {
        private readonly cache;
        constructor(cache?: Record<string, Entry>);
        get(key: string, expire: number): unknown;
        set(key: string, value: unknown): void;
        save(): void;
    }
}
