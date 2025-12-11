import type { Cache } from '$lib/types';

interface CacheEntry<T> {
    value: T;
    expiry: number;
}

export class MemoryCache implements Cache {
    private store = new Map<string, CacheEntry<any>>();

    constructor(cleanupIntervalMs: number = 5 * 60 * 1000) {
        // Run cleanup periodically to remove expired entries
        // This prevents memory leaks from keys that are never accessed again
        if (typeof setInterval !== 'undefined') {
            setInterval(() => {
                this.prune();
            }, cleanupIntervalMs).unref?.(); // unref if available (Node.js) to not hold process open
        }
    }

    private prune(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiry) {
                this.store.delete(key);
            }
        }
    }

    async get<T>(key: string): Promise<T | null> {
        const entry = this.store.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.store.delete(key);
            return null;
        }

        return entry.value as T;
    }

    async set(key: string, value: any, ttlMs: number): Promise<void> {
        this.store.set(key, {
            value,
            expiry: Date.now() + ttlMs
        });
    }

    async delete(key: string): Promise<void> {
        this.store.delete(key);
    }

    async clear(): Promise<void> {
        this.store.clear();
    }
}
