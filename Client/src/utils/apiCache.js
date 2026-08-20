/**
 * Stale-While-Revalidate Cache Helper
 * Provides instant (0ms) data loading for previously visited pages
 */
const memoryCache = new Map();

export const getCachedData = (key) => {
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  try {
    const raw = sessionStorage.getItem(`finmate_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
};

export const setCachedData = (key, data) => {
  memoryCache.set(key, data);
  try {
    sessionStorage.setItem(`finmate_cache_${key}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
};

export const clearCacheKey = (key) => {
  memoryCache.delete(key);
  try {
    sessionStorage.removeItem(`finmate_cache_${key}`);
  } catch {
    // Ignore storage errors
  }
};
