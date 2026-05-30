const { ensureUser, updateUserAndCache } = require("../../utils/dbHelpers");

module.exports = {
  name: "terminar",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const userDiv = await ensureUser(sender, msg.pushName || "Sem nome");

      if(!userDiv.casal.parceiro) {
        await sock.sendMessage(from, {text: "Você nem tem namorado(a) bro💔💔"}, {quoted: msg});
        return;
      }

      await Promise.all([
        updateUserAndCache(sender, {$set: {"casal.parceiro": null, "casal.pedido": null}}),
        updateUserAndCache(userDiv.casal.parceiro, {$set: {"casal.parceiro": null, "casal.pedido": null}})
      ]);

      await sock.sendMessage(from, {text: `NÃO!! 😭😭 @${sender.split("@")[0]} terminou com @${userDiv?.casal?.parceiro.split("@")[0]}💔💔`, mentions: [sender, userDiv.casal.parceiro]}, {quoted: msg});
    } catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
};
