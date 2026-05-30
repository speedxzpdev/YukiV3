const { mutados } = require("../../database/models/mute");
const { numberBot } = require("../../config");
const { getGroupPermission, isOwnerCached, setMuteCache } = require("../../utils/dbHelpers");

module.exports = {
  name: "mute",
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
        await reply("Mencione quem deseja mutar.");
        return;
      }

      if(await isOwnerCached(mention)) {
        await reply("Muta subdono n seu miseravel");
        return;
      }

      if(mention.includes(numberBot)) {
        await reply("Vai me mutar não seu lixo!");
        return;
      }

      const mute = await mutados.findOneAndUpdate(
        {userLid: mention, grupo: from},
        {$setOnInsert: {userLid: mention, grupo: from}},
        {upsert: true, new: false}
      );

      if(mute) {
        setMuteCache(mention, from, mute.toObject?.() || mute);
        await reply("Este usuário já está mutado.");
        return;
      }

      setMuteCache(mention, from, {userLid: mention, grupo: from, tentativasMsg: 0});
      await reply("Usuário mutado com sucesso! Caso mande mais de 3 mensagens será removido.");
    } catch(err) {
      await reply(erros_prontos);
      console.error(err);
    }
  }
};
