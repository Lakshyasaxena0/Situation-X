// backend/src/utils/cache.ts
type CacheEntry = {
  value: unknown;
  expiry: number;
};
const MAX_ENTRIES = 200;
class LRUCache {
  private store: Map<string, CacheEntry>;
  constructor() {
    this.store = new Map();
  }
  // -----------------------------
  // GET
  // -----------------------------
  get(key: string): unknown | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    // Expired check
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    // Refresh LRU position (reinsert)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }
  // -----------------------------
  // SET
  // -----------------------------
  set(key: string, value: unknown, ttlSeconds: number): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    // If key exists → delete first to refresh order
    if (this.store.has(key)) {
      this.store.delete(key);
    }
    this.store.set(key, { value, expiry });
    // Evict oldest if overflow
    if (this.store.size > MAX_ENTRIES) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }
  }
  // -----------------------------
  // DELETE
  // -----------------------------
  delete(key: string): void {
    this.store.delete(key);
  }
  // -----------------------------
  // CLEAR
  // -----------------------------
  clear(): void {
    this.store.clear();
  }
}
// -----------------------------
// SINGLETON INSTANCE
// -----------------------------
export const cache = new LRUCache();
