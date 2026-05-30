const { getGroupPermission } = require("../../utils/dbHelpers");

module.exports = {
  name: "add",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;
      const { allowed } = await getGroupPermission(sock, from, sender);

      if(!allowed) {
        await sock.sendMessage(from, {text: "Comandos para admins."}, {quoted: msg});
        return;
      }

      if(!mention) {
        await sock.sendMessage(from, {text: "Menciona alguém zé bct."}, {quoted: msg});
        return;
      }

      await sock.groupParticipantsUpdate(from, [mention], "add");
    } catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
};
