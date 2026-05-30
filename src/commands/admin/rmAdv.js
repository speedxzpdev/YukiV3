const { advertidos } = require("../../database/models/adverts");
const { getGroupPermission } = require("../../utils/dbHelpers");

module.exports = {
  name: "rmadv",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;
      const { allowed } = await getGroupPermission(sock, from, sender);

      if(!allowed) {
        await sock.sendMessage(from, {text: "TU É ADMIN?! FILHO DA PUTA!"}, {quoted: msg});
        return;
      }

      if(!mention) {
        await sock.sendMessage(from, {text: "Pelo amor de Deus... Marca alguém seu lixo!"}, {quoted: msg});
        return;
      }

      const advRemovido = await advertidos.findOneAndUpdate(
        {userLid: mention, grupo: from, adv: {$gt: 0}},
        {$inc: {adv: -1}},
        {new: true}
      );

      if(!advRemovido) {
        await sock.sendMessage(from, {text: "Esse usuário não possui advertências."}, {quoted: msg});
        return;
      }

      await sock.sendMessage(from, {text: `Advertência removida com sucesso! Agora @${advRemovido.userLid.split("@")[0]} possui ${advRemovido.adv} advertências.`, mentions: [mention]}, {quoted: msg});
    } catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
};
