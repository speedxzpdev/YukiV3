const { ensureUser, updateUserAndCache } = require("../../utils/dbHelpers");
const { normalizeUserLid } = require("../../utils/normalizeUserLid");

module.exports = {
  name: "mudarbio",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const normalizedSender = normalizeUserLid(sender);
      const bioText = args?.join(" ")?.trim();

      if(!bioText) {
        await sock.sendMessage(from, {text: `Coloque a bio desejada. Exemplo: "/mudarbio Eu amo o Speed"`}, {quoted: msg});
        return;
      }

      await ensureUser(normalizedSender, msg.pushName || "Sem nome");
      await sock.sendMessage(from, {text: "Mudando bio..."}, {quoted: msg});
      await updateUserAndCache(normalizedSender, {$set: {bio: bioText}});
      await sock.sendMessage(from, {text: `Bio mudada para: "${bioText}", use /perfil para ver alterações.`}, {quoted: msg});
    } catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
};
