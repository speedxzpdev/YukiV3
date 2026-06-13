const { advertidos } = require("../../database/models/adverts");
const { canModerateTarget, getGroupPermission } = require("../../utils/dbHelpers");

module.exports = {
  name: "adv",
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

      if(!(await canModerateTarget(sender, mention))) {
        await sock.sendMessage(from, {text: "Esse ai ta acima de tu na hierarquia."}, {quoted: msg});
        return;
      }

      const advUpdate = await advertidos.findOneAndUpdate(
        {userLid: mention, grupo: from},
        {$inc: {adv: 1}},
        {new: true, upsert: true, setDefaultsOnInsert: true}
      );

      await sock.sendMessage(from, {text: "Advertência adicionada com sucesso!"}, {quoted: msg});
      await sock.sendMessage(from, {text: `@${advUpdate.userLid.split("@")[0]}, você foi advertido. Agora possui ${advUpdate.adv}, se chegar a 3 será expulso.`, mentions: [advUpdate.userLid]}, {quoted: msg});

      if(advUpdate.adv >= 3) {
        await sock.sendMessage(from, {text: "Membro expulso por ter 3 ou mais advertências!"}, {quoted: msg});
        await sock.groupParticipantsUpdate(from, [mention], "remove");
        await advertidos.deleteOne({userLid: mention, grupo: from});
      }
    } catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
};
