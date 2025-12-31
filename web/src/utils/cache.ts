// Client-side cache utility with write-through invalidation
// Provides fast local cache with automatic invalidation on user activity

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId: string;
}

const CACHE_TTL_MS = 30000; // 30 seconds
const CACHE_PREFIX = 'finflow_cache_';

export class ClientCache {
  /**
   * Get cached data if valid, otherwise return null
   */
  static get<T>(key: string, userId: string): T | null {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Validate userId matches (security)
      if (entry.userId !== userId) {
        this.invalidate(key);
        return null;
      }
      
      // Check TTL
      const age = Date.now() - entry.timestamp;
      if (age > CACHE_TTL_MS) {
        // Don't invalidate - just mark as stale
        console.log(`[CACHE_HIT_STALE] ${key} (age: ${age}ms) - showing stale data`);
      } else {
        console.log(`[CACHE_HIT] ${key} (age: ${age}ms)`);
      }
      
      return entry.data;
    } catch (e) {
      console.error('[CACHE_ERROR] Failed to read cache:', e);
      return null;
    }
  }
  
  /**
   * Check if cache is stale (expired but still exists)
   */
  static isStale(key: string, userId: string): boolean {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return false;
      
      const entry: CacheEntry<any> = JSON.parse(cached);
      
      if (entry.userId !== userId) return false;
      
      const age = Date.now() - entry.timestamp;
      return age > CACHE_TTL_MS;
    } catch (e) {
      return false;
    }
  }

  /**
   * Set cache data
   */
  static set<T>(key: string, data: T, userId: string): void {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        userId
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(entry));
      console.log(`[CACHE_SET] ${key}`);
    } catch (e) {
      console.error('[CACHE_ERROR] Failed to set cache:', e);
    }
  }

  /**
   * Invalidate specific cache key
   */
  static invalidate(key: string): void {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      localStorage.removeItem(cacheKey);
      console.log(`[CACHE_INVALIDATE] ${key}`);
    } catch (e) {
      console.error('[CACHE_ERROR] Failed to invalidate cache:', e);
    }
  }

  /**
   * Invalidate all caches (e.g., on logout or major changes)
   */
  static invalidateAll(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      console.log('[CACHE_INVALIDATE_ALL] All caches cleared');
    } catch (e) {
      console.error('[CACHE_ERROR] Failed to invalidate all caches:', e);
    }
  }

  /**
   * Invalidate dashboard-related caches (for write operations)
   */
  static invalidateDashboard(): void {
    this.invalidate('dashboard');
    this.invalidate('health');
    this.invalidate('creditCards');
    this.invalidate('loans');
    this.invalidate('activities');
    console.log('[CACHE_INVALIDATE_DASHBOARD] Dashboard caches cleared');
  }
}

