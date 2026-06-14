const { donos } = require("../../database/models/donos");
const { getGroupPermission } = require("../../utils/dbHelpers");
const { filterOwnerSafeTargets } = require("../../utils/ownerLuck");

module.exports = {
  name: "roletarussa",
  async execute(sock, msg, from, args, erros_prontos) {
    try {
      if(from.endsWith("@lid")) {
        await sock.sendMessage(from, {text: "Usa essa porra em grupo"}, {quoted: msg});
        return;
      }

      const { metadata, allowed } = await getGroupPermission(sock, from, msg.key.participantLid || msg.key.participant);

      if(!allowed) {
        await sock.sendMessage(from, {text: "Tu é admin? Seu merda."}, {quoted: msg});
        return;
      }

      const donosTotais = await donos.find().lean();
      const donosLid = new Set(donosTotais.map(d => d.userLid));

      const members = metadata.participants.filter(p => {
        const isDono = donosLid.has(p.id) || donosLid.has(p.lid);
        return !p.admin && !isDono;
      }).map(p => p.id);

      const safeMembers = await filterOwnerSafeTargets(members);
      if(!safeMembers.length) {
        await sock.sendMessage(from, {text: "A roleta girou, mas nao achou ninguem seguro pra cair."}, {quoted: msg});
        return;
      }

      const memberRandom = safeMembers[Math.floor(Math.random() * safeMembers.length)];

      await sock.sendMessage(from, {text: `@${memberRandom.split("@")[0]}... Você foi o sorteado...`, mentions: [memberRandom]}, {quoted: msg});

      setTimeout(async () => {
        await sock.groupParticipantsUpdate(from, [memberRandom], "remove");
      }, 3000);
    } catch(err) {
      const errString = String(err);
      console.error(err);

      if(errString.includes("forbidden")) {
        await sock.sendMessage(from, {text: "Cadê meu adm? Seu lixo"}, {quoted: msg});
        return;
      }

      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
    }
  }
};
