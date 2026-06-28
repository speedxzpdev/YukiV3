const path = require("path");
const { clientRedis } = require("../lib/redis");
const { normalizeUserLid } = require("./normalizeUserLid");

const PERSONAL_AI_PREFIX = "personal-mode:ai:";

function isEnabledValue(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function isPersonalMode() {
  return isEnabledValue(process.env.YUKI_PERSONAL_MODE);
}

function getPersonalNumber() {
  return String(process.env.YUKI_PERSONAL_NUMBER || process.env.NUMBER || "5561983056421")
    .replace(/\D/g, "");
}

function resolveAuthDir(baseDir) {
  const configured = process.env.YUKI_AUTH_DIR || "assets/auth";
  return path.isAbsolute(configured) ? configured : path.join(baseDir, configured);
}

function getPersonalSender(sock) {
  const number = getPersonalNumber();
  const candidates = [
    process.env.YUKI_PERSONAL_LID,
    process.env.LENOZ_LID,
    sock?.user?.lid,
    sock?.user?.id,
    number ? `${number}@s.whatsapp.net` : null
  ];

  for (const candidate of candidates) {
    const normalized = normalizeUserLid(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function isPersonalActor({ msg, sender, sock }) {
  if (!isPersonalMode()) return false;
  if (msg?.key?.fromMe) return true;

  const normalizedSender = normalizeUserLid(sender);
  const allowed = [
    getPersonalSender(sock),
    normalizeUserLid(process.env.YUKI_PERSONAL_LID),
    normalizeUserLid(process.env.LENOZ_LID),
    normalizeUserLid(`${getPersonalNumber()}@s.whatsapp.net`)
  ].filter(Boolean);

  return !!normalizedSender && allowed.includes(normalizedSender);
}

function isExplicitCommand(body, prefixo) {
  const text = String(body || "").trim();
  const prefix = prefixo || "/";
  return text.startsWith(prefix) || text.startsWith(">");
}

function personalAiKey(chatId) {
  return `${PERSONAL_AI_PREFIX}${chatId}`;
}

async function isPersonalAiEnabled(chatId) {
  if (!isPersonalMode() || !chatId || !clientRedis?.isOpen) return false;
  return (await clientRedis.exists(personalAiKey(chatId))) === 1;
}

async function setPersonalAiEnabled(chatId, enabled) {
  if (!isPersonalMode() || !chatId || !clientRedis?.isOpen) return false;

  if (enabled) {
    await clientRedis.set(personalAiKey(chatId), "1");
    return true;
  }

  await clientRedis.del(personalAiKey(chatId));
  return true;
}

module.exports = {
  getPersonalNumber,
  getPersonalSender,
  isExplicitCommand,
  isPersonalActor,
  isPersonalAiEnabled,
  isPersonalMode,
  resolveAuthDir,
  setPersonalAiEnabled
};
