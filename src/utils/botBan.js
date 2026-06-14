const { botBans } = require("../database/models/botBans");
const { normalizeUserLid } = require("./normalizeUserLid");
const { TtlCache } = require("./hotPathCache");

const DEFAULT_BANNED_LIDS = new Set([
  "254923505713388@lid"
]);

const botBanCache = new TtlCache("botBan", Number(process.env.BOT_BAN_CACHE_TTL_MS || 60 * 1000), 5000);

function normalizeTarget(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  if (text.includes("@")) {
    return normalizeUserLid(text.replace(/^@/, ""));
  }

  const digits = text.replace(/\D/g, "");
  return digits ? normalizeUserLid(digits) : null;
}

function extractTargetFromMessage(msg, args = []) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo || {};
  const mentioned = Array.isArray(ctx.mentionedJid) ? ctx.mentionedJid[0] : ctx.mentionedJid;
  const raw =
    mentioned ||
    ctx.participantLid ||
    ctx.participant ||
    ctx.remoteJid ||
    args[0];

  return normalizeTarget(raw);
}

async function isBotBanned(userLid) {
  const normalized = normalizeTarget(userLid);
  if (!normalized) return false;

  const cached = botBanCache.get(normalized);
  if (cached !== undefined) return cached;

  const ban = await botBans.findOne({userLid: normalized}).lean();
  const banned = ban ? !!ban.active : DEFAULT_BANNED_LIDS.has(normalized);
  botBanCache.set(normalized, banned);
  return banned;
}

async function banFromBot(userLid, actorLid, reason = "banido da Yuki") {
  const target = normalizeTarget(userLid);
  if (!target) throw Object.assign(new Error("usuario invalido."), {status: 400});

  const ban = await botBans.findOneAndUpdate(
    {userLid: target},
    {
      $set: {
        active: true,
        reason: String(reason || "banido da Yuki").slice(0, 240),
        bannedBy: normalizeTarget(actorLid),
        bannedAt: new Date(),
        unbannedBy: null,
        unbannedAt: null
      }
    },
    {upsert: true, new: true, setDefaultsOnInsert: true}
  );

  botBanCache.set(target, true);
  return ban;
}

async function unbanFromBot(userLid, actorLid) {
  const target = normalizeTarget(userLid);
  if (!target) throw Object.assign(new Error("usuario invalido."), {status: 400});

  const ban = await botBans.findOneAndUpdate(
    {userLid: target},
    {
      $set: {
        active: false,
        unbannedBy: normalizeTarget(actorLid),
        unbannedAt: new Date()
      },
      $setOnInsert: {
        reason: "unban manual",
        bannedBy: null,
        bannedAt: new Date()
      }
    },
    {upsert: true, new: true, setDefaultsOnInsert: true}
  );

  botBanCache.set(target, false);
  return ban;
}

module.exports = {
  banFromBot,
  extractTargetFromMessage,
  isBotBanned,
  normalizeTarget,
  unbanFromBot
};
