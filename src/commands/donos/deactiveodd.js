const { isOwnerLid } = require("../../utils/owner");
const { setOwnerOdd } = require("../../utils/ownerLuck");

module.exports = {
  name: "deactiveodd",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      if (!isOwnerLid(sender)) return;
      await setOwnerOdd(sender, false, sender);
      await bot.reply(from, "ok.");
    } catch (err) {
      await bot.reply(from, erros_prontos || "falhou.");
      console.error("Erro no /deactiveodd:", err);
    }
  }
};
