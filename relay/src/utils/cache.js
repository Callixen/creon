/**
 * Generic TTL cache with stale-while-revalidate support
 * Used by data sources to hold snapshots between poll cycles
 */

export class TTLCache {
  /**
   * @param {object} opts
   * @param {number} opts.ttl   - Time-to-live in ms (data considered fresh)
   * @param {number} [opts.stale] - Stale window in ms (serve stale while refetching, default 2×ttl)
   * @param {string} [opts.name]  - Name for debug logging
   */
  constructor({ ttl, stale, name = 'cache' }) {
    this.ttl = ttl;
    this.stale = stale ?? ttl * 2;
    this.name = name;
    this._value = undefined;
    this._setAt = null;
    this._hits = 0;
    this._misses = 0;
  }

  set(value) {
    this._value = value;
    this._setAt = Date.now();
  }

  get() {
    return this._value;
  }

  /** Returns { value, fresh, stale, expired } */
  inspect() {
    if (this._setAt === null) {
      this._misses++;
      return { value: undefined, fresh: false, stale: false, expired: true };
    }
    const age = Date.now() - this._setAt;
    const fresh = age < this.ttl;
    const staleOk = age < this.stale;
    if (fresh) this._hits++;
    else this._misses++;
    return {
      value: this._value,
      fresh,
      stale: !fresh && staleOk,
      expired: !staleOk,
      ageMs: age,
    };
  }

  isFresh() {
    return this._setAt !== null && (Date.now() - this._setAt) < this.ttl;
  }

  clear() {
    this._value = undefined;
    this._setAt = null;
  }

  stats() {
    return {
      name: this.name,
      setAt: this._setAt,
      ageMs: this._setAt ? Date.now() - this._setAt : null,
      hits: this._hits,
      misses: this._misses,
      hitRate: this._hits + this._misses
        ? +((this._hits / (this._hits + this._misses)) * 100).toFixed(1)
        : null,
    };
  }
}

/**
 * Wrap an async fetcher with TTL cache + stale-while-revalidate.
 * Returns a function that either serves cache or calls fetcher.
 */
export function withCache(fetcher, opts) {
  const cache = new TTLCache(opts);
  let inflight = null;

  return async function cachedFetch(...args) {
    const { value, fresh, stale } = cache.inspect();

    if (fresh) return value;

    if (stale) {
      // Serve stale immediately, revalidate in background
      if (!inflight) {
        inflight = fetcher(...args)
          .then(v => { cache.set(v); return v; })
          .catch(() => {}) // keep stale on failure
          .finally(() => { inflight = null; });
      }
      return value;
    }

    // Cache expired — must fetch and wait
    if (!inflight) {
      inflight = fetcher(...args)
        .then(v => { cache.set(v); return v; })
        .finally(() => { inflight = null; });
    }

    return inflight;
  };
}
