const { donos } = require("../database/models/donos");

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

module.exports = {
  name: "aqv",

  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      const rawSender = msg.key.participant || msg.key.remoteJid;
      const dono = await donos.findOne({ userLid: rawSender });

      if (!dono) {
        await sock.sendMessage(from, { text: "Comando de dono." });
        return;
      }

      if (!from.endsWith("@g.us")) {
        await sock.sendMessage(from, { text: "Use isso em grupo." });
        return;
      }

      const metadata = await sock.groupMetadata(from);
      const creator = metadata.owner;

      const botNumberInGroup =
        metadata.participants.find(p =>
          (p.id || "").includes((sock.user?.id || "").split("@")[0])
        )?.id || sock.user?.id;

      const raw = metadata.participants || [];
      const participants = raw.map(p => p.id).filter(Boolean);

      const toRemove = participants.filter(p =>
        p !== rawSender &&
        p !== botNumberInGroup &&
        p !== creator
      );

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