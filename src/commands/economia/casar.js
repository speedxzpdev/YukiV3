const { clientRedis } = require("../../lib/redis.js");
const { numberBot } = require("../../config");
const { ensureUser } = require("../../utils/dbHelpers");

module.exports = {
  name: "namorar",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;

      if(!mention) {
        await sock.sendMessage(from, {text: "Menciona alguém, seu jumento(a) inseguro!"}, {quoted: msg});
        return;
      }

      if(mention.includes(numberBot)) {
        await sock.sendMessage(from, {text: "Eii! Eu sou apenas uma bot!"}, {quoted: msg});
        return;
      }

      const [userSender, userMention] = await Promise.all([
        ensureUser(sender, msg.pushName || "Sem nome"),
        ensureUser(mention, "Sem nome")
      ]);

      if(userSender.casal?.parceiro) {
        await sock.sendMessage(from, {text: `Hum... Estou sentindo um pouco de traição da sua parte viu...`}, {quoted: msg});
        return;
      }

      if(userMention.casal?.parceiro) {
        await sock.sendMessage(from, {text: "Ei!!! Essa pessoa já está em um relacionamento. Sinto informar..."}, {quoted: msg});
        return;
      }

      const [pedidoExisteMention, pedidoExisteSender] = await Promise.all([
        clientRedis.exists(`namoro:${mention}`),
        clientRedis.exists(`namoro:${sender}`)
      ]);

      if(pedidoExisteMention) {
        await sock.sendMessage(from, {text: "Este usuário já possui um pedido pendente!"}, {quoted: msg});
        return;
      }

      if(pedidoExisteSender) {
        await sock.sendMessage(from, {text: "Você já possui um pedido pendente!"}, {quoted: msg});
        return;
      }

      await clientRedis.hSet(`namoro:${mention}`, {
        alvo: mention,
        autor: sender
      });

      await clientRedis.expire(`namoro:${mention}`, 10 * 60);

      const buttons = [
        {buttonId: "aceitar", buttonText: {displayText: "Aceitar😍💖"}, type: 1},
        {buttonId: "recusar", buttonText: {displayText: "Recusar😒"}}
      ];

      await sock.sendMessage(from, {text: `O(a) @${mention.split("@")[0]} acaba de ser pedida em namoro por @${sender.split("@")[0]}💕\nResponda essa mensagem com: Aceitar ou Recusar`, buttons: buttons, mentions: [mention, sender]}, {quoted: msg});
    } catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
};
