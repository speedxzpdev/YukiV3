const { extractTargetFromMessage, unbanFromBot } = require("../../utils/botBan");
const { isOwnerLid } = require("../../utils/owner");

module.exports = {
  name: "unban",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      if (!isOwnerLid(sender)) {
        await bot.reply(from, "So Lenoz ou Speed podem reverter ban global da Yuki.");
        return;
      }

      const target = extractTargetFromMessage(msg, args);
      if (!target) {
        await bot.reply(from, "Use /unban respondendo alguem, marcando @, ou passando numero/LID.");
        return;
      }

      await unbanFromBot(target, sender);
      await bot.reply(from, `Pronto. ${target} pode usar a Yuki de novo.`);
    } catch (err) {
      await bot.reply(from, erros_prontos || "Nao consegui remover o ban global.");
      console.error("Erro no /unban:", err);
    }
  }
};
