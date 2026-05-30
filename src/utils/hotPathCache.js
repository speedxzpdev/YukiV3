class TtlCache {
  constructor(name, ttlMs, maxSize = 1000) {
    this.name = name;
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  get(key) {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses += 1;
      logCacheEvent(this.name, "miss", key);
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.stats.misses += 1;
      this.stats.evictions += 1;
      logCacheEvent(this.name, "expired", key);
      return undefined;
    }

    this.stats.hits += 1;
    logCacheEvent(this.name, "hit", key);
    return entry.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    if (!this.store.has(key) && this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
        this.stats.evictions += 1;
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
    this.stats.sets += 1;
  }

  delete(key) {
    const deleted = this.store.delete(key);
    if (deleted) this.stats.deletes += 1;
    return deleted;
  }

  snapshot() {
    return {
      name: this.name,
      size: this.store.size,
      ...this.stats
    };
  }
}

function logCacheEvent(name, type, key) {
  if (process.env.DEBUG_MONGO_CACHE !== "true") return;
  console.log(`[mongo-cache] ${name} ${type}: ${key}`);
}

const userCache = new TtlCache("user", Number(process.env.USER_CACHE_TTL_MS || 60 * 1000), 5000);
const groupCache = new TtlCache("group", Number(process.env.GROUP_CACHE_TTL_MS || 30 * 1000), 2000);
const ownerCache = new TtlCache("owner", Number(process.env.OWNER_CACHE_TTL_MS || 10 * 60 * 1000), 2000);
const muteCache = new TtlCache("mute", Number(process.env.MUTE_CACHE_TTL_MS || 10 * 60 * 1000), 5000);
const caches = [userCache, groupCache, ownerCache, muteCache];

const summaryMs = Number(process.env.MONGO_CACHE_SUMMARY_MS || 60 * 1000);
if (summaryMs > 0) {
  const summaryTimer = setInterval(() => {
    const summary = caches
      .map((cache) => {
        const snapshot = cache.snapshot();
        return `${snapshot.name}:size=${snapshot.size},hit=${snapshot.hits},miss=${snapshot.misses}`;
      })
      .join(" | ");

    console.log(`[mongo-cache] resumo ${summary}`);
  }, summaryMs);

  if (typeof summaryTimer.unref === "function") {
    summaryTimer.unref();
  }
}

module.exports = {
  TtlCache,
  groupCache,
  muteCache,
  ownerCache,
  userCache
};
