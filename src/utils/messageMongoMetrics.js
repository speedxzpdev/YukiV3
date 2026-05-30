const SLOW_QUERY_MS = Number(process.env.MONGO_HOTPATH_SLOW_MS || 150);
const SUMMARY_INTERVAL_MS = Number(process.env.MONGO_HOTPATH_SUMMARY_MS || 60 * 1000);

const totals = {
  messages: 0,
  queries: 0,
  queryMs: 0,
  queuedWrites: 0,
  slowQueries: 0,
  lastSummaryAt: Date.now()
};

function createMessageMongoMetrics({ from, sender }) {
  const startedAt = Date.now();

  return {
    from,
    sender,
    queries: 0,
    queryMs: 0,
    queuedWrites: 0,
    slowQueries: []
  };
}

async function trackMongo(metrics, label, operation) {
  const startedAt = Date.now();

  try {
    return await operation();
  } finally {
    const duration = Date.now() - startedAt;

    metrics.queries += 1;
    metrics.queryMs += duration;
    totals.queries += 1;
    totals.queryMs += duration;

    if (duration >= SLOW_QUERY_MS) {
      metrics.slowQueries.push({ label, duration });
      totals.slowQueries += 1;
      console.log(`[mongo-hotpath] query lenta ${label}: ${duration}ms`);
    }
  }
}

function markQueuedWrite(metrics, count = 1) {
  metrics.queuedWrites += count;
  totals.queuedWrites += count;
}

function finishMessageMongoMetrics(metrics) {
  totals.messages += 1;

  if (
    process.env.DEBUG_MONGO_HOTPATH === "true" ||
    metrics.queries >= Number(process.env.MONGO_HOTPATH_WARN_QUERIES || 6)
  ) {
    console.log(
      `[mongo-hotpath] msg from=${metrics.from} sender=${metrics.sender} ` +
      `queries=${metrics.queries} queuedWrites=${metrics.queuedWrites} queryMs=${metrics.queryMs}`
    );
  }

  const now = Date.now();
  if (now - totals.lastSummaryAt >= SUMMARY_INTERVAL_MS) {
    const avgQueries = totals.messages ? (totals.queries / totals.messages).toFixed(2) : "0.00";
    const avgQueryMs = totals.queries ? (totals.queryMs / totals.queries).toFixed(1) : "0.0";
    const avgQueuedWrites = totals.messages ? (totals.queuedWrites / totals.messages).toFixed(2) : "0.00";

    console.log(
      `[mongo-hotpath] resumo ${totals.messages} msgs: ` +
      `avgQueries=${avgQueries}, avgQueryMs=${avgQueryMs}, ` +
      `avgQueuedWrites=${avgQueuedWrites}, slowQueries=${totals.slowQueries}`
    );

    totals.messages = 0;
    totals.queries = 0;
    totals.queryMs = 0;
    totals.queuedWrites = 0;
    totals.slowQueries = 0;
    totals.lastSummaryAt = now;
  }
}

module.exports = {
  createMessageMongoMetrics,
  finishMessageMongoMetrics,
  markQueuedWrite,
  trackMongo
};
