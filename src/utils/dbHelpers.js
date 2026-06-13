const { users } = require("../database/models/users");
const { grupos } = require("../database/models/grupos");
const { donos } = require("../database/models/donos");
const { isOwnerLid } = require("./owner");
const { groupCache, muteCache, ownerCache, userCache } = require("./hotPathCache");
const NULL_CACHE_TTL_MS = Number(process.env.NULL_CACHE_TTL_MS || 5 * 1000);

function toPlain(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === "function") return doc.toObject();
  return doc;
}

function invalidateUser(userLid) {
  if (userLid) userCache.delete(userLid);
}

function invalidateGroup(groupId) {
  if (groupId) groupCache.delete(groupId);
}

function invalidateOwner(userLid) {
  if (userLid) ownerCache.delete(userLid);
}

function muteCacheKey(userLid, groupId) {
  return `${groupId || ""}\u0000${userLid || ""}`;
}

function setMuteCache(userLid, groupId, value, ttlMs) {
  if (!userLid || !groupId) return;
  muteCache.set(muteCacheKey(userLid, groupId), value, ttlMs);
}

function invalidateMute(userLid, groupId) {
  if (!userLid || !groupId) return;
  muteCache.delete(muteCacheKey(userLid, groupId));
}

async function ensureUser(userLid, name = "Sem nome") {
  if (!userLid) return null;

  const cached = userCache.get(userLid);
  if (cached) return cached;

  const user = await users.findOneAndUpdate(
    { userLid },
    { $setOnInsert: { userLid, name } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  userCache.set(userLid, toPlain(user));
  return user;
}

async function getUserCached(userLid) {
  if (!userLid) return null;

  const cached = userCache.get(userLid);
  if (cached !== undefined) return cached;

  const user = await users.findOne({ userLid }).lean();
  userCache.set(userLid, user || null, user ? undefined : NULL_CACHE_TTL_MS);
  return user;
}

function groupDefaults(groupId, metadata = {}) {
  return {
    groupId,
    grupoName: metadata.subject || metadata.grupoName || "Sem nome",
    ownerId: metadata.owner || metadata.ownerId || "Sem dono"
  };
}

function normalizeUpdateWithInsertDefaults(groupId, update, metadata) {
  const hasOperator = Object.keys(update).some((key) => key.startsWith("$"));
  const normalized = hasOperator ? { ...update } : { $set: update };
  const insertDefaults = {
    ...groupDefaults(groupId, metadata),
    ...(normalized.$setOnInsert || {})
  };

  const updatePaths = Object.entries(normalized)
    .filter(([operator]) => operator !== "$setOnInsert")
    .flatMap(([, value]) => Object.keys(value || {}));

  for (const key of Object.keys(insertDefaults)) {
    if (updatePaths.some((path) => path === key || path.startsWith(`${key}.`) || key.startsWith(`${path}.`))) {
      delete insertDefaults[key];
    }
  }

  normalized.$setOnInsert = insertDefaults;

  return normalized;
}

async function ensureGroup(groupId, metadata = {}) {
  if (!groupId) return null;

  const cached = groupCache.get(groupId);
  if (cached) return cached;

  const group = await grupos.findOneAndUpdate(
    { groupId },
    { $setOnInsert: groupDefaults(groupId, metadata) },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  groupCache.set(groupId, toPlain(group));
  return group;
}

async function ensureGroupFromSocket(sock, groupId) {
  const cached = groupCache.get(groupId);
  if (cached) return cached;

  let metadata = {};

  try {
    metadata = await sock.groupMetadata(groupId);
  } catch (err) {
    console.error("Erro ao buscar metadata do grupo:", err?.data || err?.message || err);
  }

  return ensureGroup(groupId, metadata);
}

async function updateGroupAndCache(groupId, update, options = {}) {
  if (!groupId) return null;

  const group = await grupos.findOneAndUpdate(
    { groupId },
    normalizeUpdateWithInsertDefaults(groupId, update, options.metadata),
    { upsert: options.upsert !== false, new: true, setDefaultsOnInsert: true }
  );

  groupCache.set(groupId, toPlain(group));
  return group;
}

async function updateUserAndCache(userLid, update, options = {}) {
  if (!userLid) return null;

  const hasOperator = Object.keys(update).some((key) => key.startsWith("$"));
  const normalized = hasOperator ? { ...update } : { $set: update };

  if (options.upsert === true) {
    normalized.$setOnInsert = {
      userLid,
      name: options.name || "Sem nome",
      ...(normalized.$setOnInsert || {})
    };
  }

  const user = await users.findOneAndUpdate(
    { userLid, ...(options.filter || {}) },
    normalized,
    { upsert: options.upsert === true, new: true, setDefaultsOnInsert: true }
  );

  if (user) userCache.set(userLid, toPlain(user));
  else invalidateUser(userLid);
  return user;
}

async function isOwnerCached(userLid) {
  if (!userLid) return false;
  if (isOwnerLid(userLid)) return true;

  const cached = ownerCache.get(userLid);
  if (cached !== undefined) return cached;

  const owner = await donos.findOne({ userLid }).lean();
  const isOwner = !!owner;
  ownerCache.set(userLid, isOwner, isOwner ? undefined : 60 * 1000);
  return isOwner;
}

async function getOwnerLevelCached(userLid) {
  if (!userLid) return 0;
  if (isOwnerLid(userLid)) return 2;
  if (await isOwnerCached(userLid)) return 1;
  return 0;
}

async function canModerateTarget(actorLid, targetLid) {
  const targetLevel = await getOwnerLevelCached(targetLid);
  if (targetLevel === 0) return true;

  const actorLevel = await getOwnerLevelCached(actorLid);
  return actorLevel > targetLevel;
}

async function getGroupPermission(sock, groupId, sender) {
  const [metadata, isOwner] = await Promise.all([
    sock.groupMetadata(groupId),
    isOwnerCached(sender)
  ]);

  const adminIds = metadata.participants
    .filter((participant) => participant.admin)
    .flatMap((participant) => [participant.id, participant.lid])
    .filter(Boolean);

  return {
    metadata,
    isOwner,
    isAdmin: adminIds.includes(sender),
    allowed: isOwner || adminIds.includes(sender)
  };
}

module.exports = {
  ensureGroup,
  ensureGroupFromSocket,
  ensureUser,
  canModerateTarget,
  getGroupPermission,
  getOwnerLevelCached,
  getUserCached,
  invalidateGroup,
  invalidateMute,
  invalidateOwner,
  invalidateUser,
  isOwnerCached,
  muteCacheKey,
  setMuteCache,
  updateGroupAndCache,
  updateUserAndCache
};
