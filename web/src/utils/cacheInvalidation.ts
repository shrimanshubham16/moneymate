// Cache invalidation utility for write operations
// Automatically invalidates client cache after mutations

import { ClientCache } from './cache';

/**
 * Invalidate all dashboard-related caches after a write operation
 * Call this after any add/edit/delete operation
 */
export function invalidateDashboardCache(): void {
  ClientCache.invalidateDashboard();
  console.log('[WRITE_INVALIDATE] Dashboard caches cleared after mutation');
}

/**
 * Wrapper for API mutation calls that auto-invalidates cache
 */
export async function withCacheInvalidation<T>(
  apiCall: () => Promise<T>
): Promise<T> {
  const result = await apiCall();
  invalidateDashboardCache();
  return result;
}



