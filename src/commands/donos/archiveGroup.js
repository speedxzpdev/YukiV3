const { numberBot, numberBotJid } = require("../../config");
const { isOwnerCached } = require("../../utils/dbHelpers");
const { normalizeUserLid } = require("../../utils/normalizeUserLid");

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function jidMatches(a, b) {
  if (!a || !b) return false;
  return a === b || normalizeUserLid(a) === normalizeUserLid(b);
}

function participantMatches(participant, ids) {
  return [participant?.id, participant?.lid]
    .filter(Boolean)
    .some((participantId) => ids.some((id) => jidMatches(participantId, id)));
}

module.exports = {
  name: "aqv",

  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const rawSender = sender

      if (!(await isOwnerCached(rawSender))) {
        await sock.sendMessage(from, { text: "Comando de dono." });
        return;
      }

      if (!from.endsWith("@g.us")) {
        await sock.sendMessage(from, { text: "Use isso em grupo." });
        return;
      }

      const metadata = await sock.groupMetadata(from);
      const creator = metadata.owner;

      const botIds = [
        numberBot,
        numberBotJid,
        sock.user?.id,
        sock.user?.lid,
        sock.user?.jid
      ].filter(Boolean);

      const raw = metadata.participants || [];
      const toRemove = raw
        .filter((participant) =>
          participant.id &&
          !participantMatches(participant, [rawSender, creator]) &&
          !participantMatches(participant, botIds)
        )
        .map((participant) => participant.id);

      if (toRemove.length === 0) {
        await sock.sendMessage(from, { text: "Nada para remover." });
        return;
      }

      const batches = chunk(toRemove, 8);
      const removed = [];
      const failed = [];

      for (const batch of batches) {
        try {
          await sock.groupParticipantsUpdate(from, batch, "remove");
          removed.push(...batch);
          await sock.sendMessage(from, { text: "Removendo: " + batch.join(", ") });
        } catch {
          failed.push(batch);
          await sock.sendMessage(from, { text: "Falha: " + batch.join(", ") });
        }
      }

      let msgFinal = `Removidos: ${removed.length}.`;
      if (failed.length) msgFinal += ` Falhas: ${failed.length}.`;
      await sock.sendMessage(from, { text: msgFinal });

    } catch (err) {
      await sock.sendMessage(from, { text: erros_prontos }, { quoted: msg });
    }
  }
};
