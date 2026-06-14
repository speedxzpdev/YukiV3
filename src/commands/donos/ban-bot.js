const { banFromBot, extractTargetFromMessage, normalizeTarget } = require("../../utils/botBan");
const { isOwnerLid } = require("../../utils/owner");
const { numberBot } = require("../../config");

module.exports = {
  name: "ban-bot",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      if (!isOwnerLid(sender)) {
        await bot.reply(from, "So Lenoz ou Speed podem banir alguem da Yuki inteira.");
        return;
      }

      const target = extractTargetFromMessage(msg, args);
      if (!target) {
        await bot.reply(from, "Use /ban-bot respondendo alguem, marcando @, ou passando numero/LID.");
        return;
      }

      if (isOwnerLid(target)) {
        await bot.reply(from, "Nao vou banir dono real da Yuki.");
        return;
      }

      if (target === numberBot) {
        await bot.reply(from, "Eu mesma nao, ne.");
        return;
      }

      const firstArgTarget = normalizeTarget(args[0]);
      const reasonArgs = firstArgTarget === target ? args.slice(1) : args;
      const reason = reasonArgs.join(" ") || "banido da Yuki";
      await banFromBot(target, sender, reason);
      await bot.reply(from, `Fechado. A Yuki nao vai mais responder ${target}.`);
    } catch (err) {
      await bot.reply(from, erros_prontos || "Nao consegui banir esse usuario da Yuki.");
      console.error("Erro no /ban-bot:", err);
    }
  }
};
