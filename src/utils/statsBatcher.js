const { rankativos } = require("../database/models/rankativos");
const { grupos } = require("../database/models/grupos");
const { users } = require("../database/models/users");
const { groupCache, userCache } = require("./hotPathCache");

const FLUSH_INTERVAL_MS = Number(process.env.STATS_FLUSH_INTERVAL_MS || 5000);
const MAX_PENDING_KEYS = Number(process.env.STATS_FLUSH_MAX_PENDING_KEYS || 200);

const rankIncrements = new Map();
const groupCommandIncrements = new Map();
const userCommandIncrements = new Map();

let flushTimer = null;
let flushing = false;

function rankKey(userLid, from) {
  return `${userLid}\u0000${from}`;
}

function queueRankIncrement(userLid, from, field, amount = 1) {
  if (!userLid || !from) return;

  const key = rankKey(userLid, from);
  const current = rankIncrements.get(key) || {
    userLid,
    from,
    msg: 0,
    cmdUsados: 0
  };

  current[field] += amount;
  rankIncrements.set(key, current);
  scheduleFlush();
}

function queueMessageActivity(userLid, from, amount = 1) {
  queueRankIncrement(userLid, from, "msg", amount);
}

function queueCommandActivity(userLid, from, amount = 1) {
  queueRankIncrement(userLid, from, "cmdUsados", amount);

  if (from?.endsWith("@g.us")) {
    groupCommandIncrements.set(from, (groupCommandIncrements.get(from) || 0) + amount);
  }

  if (userLid) {
    userCommandIncrements.set(userLid, (userCommandIncrements.get(userLid) || 0) + amount);
  }

  scheduleFlush();
}

function pendingKeyCount() {
  return rankIncrements.size + groupCommandIncrements.size + userCommandIncrements.size;
}

function scheduleFlush() {
  if (pendingKeyCount() >= MAX_PENDING_KEYS) {
    setImmediate(() => flushStats("max-pending"));
    return;
  }

  if (flushTimer) return;

  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushStats("interval");
  }, FLUSH_INTERVAL_MS);

  if (typeof flushTimer.unref === "function") {
    flushTimer.unref();
  }
}

async function flushStats(reason = "manual") {
  if (flushing) return;
  if (pendingKeyCount() === 0) return;

  flushing = true;

  const rankSnapshot = Array.from(rankIncrements.values());
  const groupSnapshot = Array.from(groupCommandIncrements.entries());
  const userSnapshot = Array.from(userCommandIncrements.entries());

  rankIncrements.clear();
  groupCommandIncrements.clear();
  userCommandIncrements.clear();

  const startedAt = Date.now();

  try {
    const rankOps = rankSnapshot.map((item) => {
      const inc = {};
      if (item.msg) inc.msg = item.msg;
      if (item.cmdUsados) inc.cmdUsados = item.cmdUsados;

      return {
        updateOne: {
          filter: { userLid: item.userLid, from: item.from },
          update: { $inc: inc },
          upsert: true
        }
      };
    });

    const groupOps = groupSnapshot.map(([groupId, amount]) => ({
      updateOne: {
        filter: { groupId },
        update: { $inc: { cmdUsados: amount } }
      }
    }));

    const userOps = userSnapshot.map(([userLid, amount]) => ({
      updateOne: {
        filter: { userLid },
        update: { $inc: { cmdCount: amount } }
      }
    }));

    await Promise.all([
      rankOps.length ? rankativos.bulkWrite(rankOps, { ordered: false }) : null,
      groupOps.length ? grupos.bulkWrite(groupOps, { ordered: false }) : null,
      userOps.length ? users.bulkWrite(userOps, { ordered: false }) : null
    ]);

    for (const [groupId] of groupSnapshot) groupCache.delete(groupId);
    for (const [userLid] of userSnapshot) userCache.delete(userLid);

    console.log(
      `[mongo-stats] flush ${reason}: rank=${rankOps.length}, group=${groupOps.length}, ` +
      `user=${userOps.length}, ms=${Date.now() - startedAt}`
    );
  } catch (err) {
    console.error("[mongo-stats] erro ao gravar contadores em lote:", err);

    for (const item of rankSnapshot) {
      const key = rankKey(item.userLid, item.from);
      const current = rankIncrements.get(key) || {
        userLid: item.userLid,
        from: item.from,
        msg: 0,
        cmdUsados: 0
      };
      current.msg += item.msg;
      current.cmdUsados += item.cmdUsados;
      rankIncrements.set(key, current);
    }

    for (const [groupId, amount] of groupSnapshot) {
      groupCommandIncrements.set(groupId, (groupCommandIncrements.get(groupId) || 0) + amount);
    }

    for (const [userLid, amount] of userSnapshot) {
      userCommandIncrements.set(userLid, (userCommandIncrements.get(userLid) || 0) + amount);
    }
  } finally {
    flushing = false;

    if (pendingKeyCount() > 0) {
      scheduleFlush();
    }
  }
}

process.once("beforeExit", () => {
  if (pendingKeyCount() > 0) {
    flushStats("beforeExit").catch((err) => {
      console.error("[mongo-stats] erro no flush final:", err);
    });
  }
});

module.exports = {
  flushStats,
  queueCommandActivity,
  queueMessageActivity
};
