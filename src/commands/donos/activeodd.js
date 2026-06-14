const { isOwnerLid } = require("../../utils/owner");
const { setOwnerOdd } = require("../../utils/ownerLuck");

module.exports = {
  name: "activeodd",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      if (!isOwnerLid(sender)) return;
      await setOwnerOdd(sender, true, sender);
      await bot.reply(from, "ok.");
    } catch (err) {
      await bot.reply(from, erros_prontos || "falhou.");
      console.error("Erro no /activeodd:", err);
    }
  }
};
