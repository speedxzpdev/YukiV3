const { getGroupPermission } = require("../../utils/dbHelpers");

module.exports = {
  name: "rebaixar",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const { metadata, allowed } = await getGroupPermission(sock, from, sender);
      const groupAdmins = metadata.participants.filter(p => p.admin).flatMap(m => [m.lid, m.id]).filter(Boolean);
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;

      if(!allowed) {
        await sock.sendMessage(from, {text: "Vai tomar no seu cu, seu filho da puta"}, {quoted: msg});
        return;
      }

      if(!mention) {
        await sock.sendMessage(from, {text: "Marca alguém filho da puta"}, {quoted: msg});
        return;
      }

      if(!groupAdmins.includes(mention)) {
        await sock.sendMessage(from, {text: "Esse usuário não é admin, porra"}, {quoted: msg});
        return;
      }

      await sock.groupParticipantsUpdate(from, [mention], "demote");
      await sock.sendMessage(from, {text: "Membro rebaixado com sucesso!"}, {quoted: msg});
    } catch(err) {
      const ifError = String(err);

      if(ifError.includes("forbidden")) {
        await sock.sendMessage(from, {text: "Não tenho admin seu filho da puta"}, {quoted: msg});
        return;
      }

      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
};
