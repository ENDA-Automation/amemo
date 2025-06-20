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

export const NotFound = Symbol("NotFound");

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
