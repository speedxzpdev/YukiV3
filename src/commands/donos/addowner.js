const { donos } = require("../../database/models/donos");
const { invalidateOwner } = require("../../utils/dbHelpers");
const { isOwnerLid } = require("../../utils/owner");

module.exports = {
  name: "adddono",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const mention =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        msg.message?.extendedTextMessage?.contextInfo?.participant;

      if (!isOwnerLid(sender)) {
        await sock.sendMessage(from, { text: "Só o Speed pode usar este comando." }, { quoted: msg });
        return;
      }

      if (!mention) {
        await sock.sendMessage(from, { text: "mencione alguém." }, { quoted: msg });
        return;
      }

      const owner = await donos.findOneAndUpdate(
        { userLid: mention },
        { $setOnInsert: { userLid: mention } },
        { upsert: true, new: false }
      );

      if (owner) {
        await sock.sendMessage(from, { text: "Este usuário já é dono." }, { quoted: msg });
        return;
      }

      invalidateOwner(mention);
      await sock.sendMessage(from, { text: "Novo dono registrado com sucesso!" }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: erros_prontos }, { quoted: msg });
      console.error(err);
    }
  }
};
