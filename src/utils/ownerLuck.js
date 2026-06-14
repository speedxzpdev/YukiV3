const { isOwnerLid } = require("./owner");
const { normalizeUserLid } = require("./normalizeUserLid");
const { ownerOdds } = require("../database/models/ownerOdds");
const { TtlCache } = require("./hotPathCache");

const ownerOddCache = new TtlCache("ownerOdd", Number(process.env.OWNER_ODD_CACHE_TTL_MS || 60 * 1000), 100);

async function isOwnerOddActive(userLid) {
  const normalized = normalizeUserLid(userLid);
  if (!isOwnerLid(normalized)) return false;

  const cached = ownerOddCache.get(normalized);
  if (cached !== undefined) return cached;

  const config = await ownerOdds.findOne({userLid: normalized}).lean();
  const active = config?.active !== false;
  ownerOddCache.set(normalized, active);
  return active;
}

async function setOwnerOdd(userLid, active, actorLid = userLid) {
  const normalized = normalizeUserLid(userLid);
  if (!isOwnerLid(normalized)) {
    throw Object.assign(new Error("apenas dono real pode alterar odd."), {status: 403});
  }

  const config = await ownerOdds.findOneAndUpdate(
    {userLid: normalized},
    {$set: {active: !!active, updatedBy: normalizeUserLid(actorLid)}},
    {upsert: true, new: true, setDefaultsOnInsert: true}
  );

  ownerOddCache.set(normalized, !!active);
  return config;
}

async function resolveOwnerDuel(first, second) {
  const firstLid = normalizeUserLid(first);
  const secondLid = normalizeUserLid(second);
  const firstOwner = await isOwnerOddActive(firstLid);
  const secondOwner = await isOwnerOddActive(secondLid);

  if (firstOwner && secondOwner) {
    return {type: "draw", first: firstLid, second: secondLid};
  }

  if (firstOwner) {
    return {type: "win", winner: firstLid, loser: secondLid};
  }

  if (secondOwner) {
    return {type: "win", winner: secondLid, loser: firstLid};
  }

  return {type: "random", first: firstLid, second: secondLid};
}

async function filterOwnerSafeTargets(targets) {
  const list = (targets || []).filter(Boolean);
  const checks = await Promise.all(list.map(async (target) => ({
    target,
    protected: await isOwnerOddActive(target)
  })));
  const safe = checks.filter((item) => !item.protected).map((item) => item.target);
  return safe.length ? safe : [];
}

module.exports = {
  filterOwnerSafeTargets,
  isOwnerOddActive,
  resolveOwnerDuel,
  setOwnerOdd
};
