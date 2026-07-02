const BLOCKED_PHONE_NUMBERS = new Set([
  "5561982447565"
]);

function getJidUserDigits(value) {
  const user = String(value || "")
    .trim()
    .replace(/^@/, "")
    .split("@")[0]
    .split(":")[0];

  return user.replace(/\D/g, "");
}

function getParticipantIds(participant) {
  if (!participant) return [];
  if (typeof participant === "string") return [participant];

  return [
    participant.id,
    participant.lid,
    participant.jid
  ].filter(Boolean);
}

function isBlockedParticipant(participant) {
  return getParticipantIds(participant)
    .some((id) => BLOCKED_PHONE_NUMBERS.has(getJidUserDigits(id)));
}

function getBlockedRemovalTargets(participants = []) {
  const targets = new Set();

  for (const participant of participants) {
    if (!isBlockedParticipant(participant)) continue;

    const target = typeof participant === "string"
      ? participant
      : participant.id || participant.jid || participant.lid;

    if (target) targets.add(target);
  }

  return [...targets];
}

async function removeBlockedParticipantsFromGroup(sock, groupId, metadata = null) {
  if (!sock || !groupId) return 0;

  const groupMetadata = metadata || await sock.groupMetadata(groupId);
  const targets = getBlockedRemovalTargets(groupMetadata?.participants || []);

  if (!targets.length) return 0;

  await sock.groupParticipantsUpdate(groupId, targets, "remove");
  console.log(`[blocked-participants] removidos de ${groupId}: ${targets.join(", ")}`);
  return targets.length;
}

async function removeBlockedParticipantsFromAllGroups(sock) {
  if (!sock || typeof sock.groupFetchAllParticipating !== "function") {
    console.log("[blocked-participants] groupFetchAllParticipating indisponivel.");
    return 0;
  }

  const groups = await sock.groupFetchAllParticipating();
  let removed = 0;

  for (const [groupId, cachedMetadata] of Object.entries(groups || {})) {
    try {
      const metadata = cachedMetadata?.participants?.length
        ? cachedMetadata
        : await sock.groupMetadata(groupId);

      removed += await removeBlockedParticipantsFromGroup(sock, groupId, metadata);
    } catch (err) {
      console.error(`[blocked-participants] erro ao limpar ${groupId}:`, err?.data || err?.message || err);
    }
  }

  if (removed) {
    console.log(`[blocked-participants] varredura finalizada, removidos: ${removed}`);
  }

  return removed;
}

module.exports = {
  getBlockedRemovalTargets,
  isBlockedParticipant,
  removeBlockedParticipantsFromAllGroups,
  removeBlockedParticipantsFromGroup
};
