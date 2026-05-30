const { getGroupPermission } = require("../../utils/dbHelpers");

module.exports = {
  name: "d",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const msgquoted = msg.message.extendedTextMessage.contextInfo;
      const { allowed } = await getGroupPermission(sock, from, sender);

      if(!allowed) {
        await sock.sendMessage(from, {text: "Comando exlusivo de admins!"}, {quoted: msg});
        return;
      }

      await sock.sendMessage(from, {delete: {
        remoteJid: from,
        fromMe: false,
        id: msgquoted.stanzaId,
        participant: msgquoted.participant || undefined
      }});
    } catch(err) {
      const msgError = String(err);

      if(msgError.includes("forbiden")) {
        await sock.sendMessage(from, {text: "Não possuo admin para apagar mensagens."}, {quoted: msg});
        return;
      }

      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
};
