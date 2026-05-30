const { mutados } = require("../../database/models/mute");
const { getGroupPermission, invalidateMute } = require("../../utils/dbHelpers");

module.exports = {
  name: "unmute",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    async function reply(texto) {
      await sock.sendMessage(from, {text: texto}, {quoted: msg});
    }

    try {
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;
      const { allowed } = await getGroupPermission(sock, from, sender);

      if(!allowed) {
        await reply("Você n é admin, zé bct");
        return;
      }

      if(!mention) {
        await reply("Mencione quem deseja desmutar.");
        return;
      }

      const result = await mutados.deleteOne({userLid: mention, grupo: from});

      if(!result.deletedCount) {
        await reply("Esse usuário não está mutado.");
        return;
      }

      invalidateMute(mention, from);
      await reply("Usuário desmutado com sucesso!");
    } catch(err) {
      await reply(erros_prontos);
      console.error(err);
    }
  }
};
