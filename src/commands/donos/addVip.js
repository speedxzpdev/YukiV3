const { ensureUser, isOwnerCached, updateUserAndCache } = require("../../utils/dbHelpers");

module.exports = {
  name: "addvip",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      if(!(await isOwnerCached(sender))) {
        await sock.sendMessage(from, {text: "Só donos podem usar essa merda!"}, {quoted: msg});
        return;
      }

      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        || msg.message?.extendedTextMessage?.contextInfo?.participant;

      if(!mention) {
        await sock.sendMessage(from, {text: "Marca alguém miserável!"}, {quoted: msg});
        return;
      }

      await ensureUser(mention, msg.pushName || "sem nome");

      const parametro = args[0]?.trim();
      const diasVip = Number(parametro);

      if(!diasVip || diasVip <= 0) {
        await sock.sendMessage(from, {text: "Digite um valor de dias válido!"}, {quoted: msg});
        return;
      }

      const msgEspera = await sock.sendMessage(from, {text: "Adicionando vip..."}, {quoted: msg});
      const diaMs = 24 * 60 * 60 * 1000;
      const vencimentoMs = diasVip * diaMs;

      await updateUserAndCache(mention, {$set: {isVip: true, vencimentoVip: Date.now() + vencimentoMs}});
      await sock.sendMessage(from, {text: `${diasVip} dias de vip adicionado para @${mention.split("@")[0]}`, edit: msgEspera.key, mentions: [mention]});
    } catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
};
