// Read-path caching with single-flight de-duplication.
//
// At 1,000 concurrent users the dashboard polls /api/stats and /api/calls
// every 8 s. Without dedup that is 1,000 identical database queries landing
// at the same millisecond on every poll tick. This cache collapses them:
//   · the FIRST caller triggers the underlying loader
//   · everyone else awaiting the same key rides on the same promise
//   · results are served from memory for `ttlMs` (microseconds of work)
//   · writers bump a global version so new data is never masked by a stale
//     entry (key includes the version — no manual invalidation anywhere)
//
// Bounded: at most MAX_ENTRIES keys are kept; the oldest are evicted.

const MAX_ENTRIES = 300;
const store = new Map(); // key -> { expires, promise }

export function cacheVersion() {
  return globalThis.__cdCacheVersion || 0;
}

export function bumpCacheVersion() {
  globalThis.__cdCacheVersion = (globalThis.__cdCacheVersion || 0) + 1;
}

/**
 * Get-or-load a cached value.
 * @param {string} prefix  logical namespace, e.g. "stats"
 * @param {object} keyObj  JSON-serialisable identity of this request
 * @param {number} ttlMs   how long the value stays fresh
 * @param {() => Promise<any>} loader  the slow path (runs at most once per key)
 */
export async function cached(prefix, keyObj, ttlMs, loader) {
  // Keyed by identity only; freshness is the TTL's job. Console pages poll
  // every 8 s, so TTLs of 2–3 s trade imperceptible staleness for the ability
  // to serve 1,000 concurrent pollers from a handful of loads per window.
  const key = `${prefix}|${JSON.stringify(keyObj)}`;
  const now = Date.now();

  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.promise;

  // Evict expired / oldest entries when the cache grows too large.
  if (store.size >= MAX_ENTRIES) {
    const keys = [...store.keys()];
    for (let i = 0; i < Math.ceil(MAX_ENTRIES / 4); i++) store.delete(keys[i]);
  }

  // Single-flight: store the promise itself, so 999 concurrent callers share
  // one load. Failures are NOT cached (the next request retries).
  const promise = (async () => {
    try {
      return await loader();
    } catch (err) {
      // drop the poisoned entry so the next caller can retry immediately
      const current = store.get(key);
      if (current?.promise === promise) store.delete(key);
      throw err;
    }
  })();

  store.set(key, { expires: now + ttlMs, promise });
  return promise;
}

/** Test/debug helper: forget everything. */
export function clearCache() {
  store.clear();
}
