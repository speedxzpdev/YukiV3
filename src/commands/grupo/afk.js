const { ensureGroupFromSocket, updateGroupAndCache } = require("../../utils/dbHelpers");

module.exports = {
  name: "afkmode",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    async function sendHelp() {
      await sock.sendMessage(from, {
        text: `*Como usar comandos de opção:*\n0 - Desativado | Desligado\n>\nExemplo: "/welcome 0"\n1 - Ativado | Ligado\n> Exemplo: "/welcome 1"`
      }, { quoted: msg });
    }

    try {
      if(!from.endsWith("@g.us")) {
        await bot.reply(from, "Use esse comando em um grupo!");
        return;
      }

      const grupo = await ensureGroupFromSocket(sock, from);
      const afkList = Array.isArray(grupo?.afkList) ? grupo.afkList : [];
      const rawParam = args?.[0];

      if(rawParam === undefined) {
        await sendHelp();
        return;
      }

      const parametro = Number(rawParam);

      if(!Number.isInteger(parametro) || (parametro !== 0 && parametro !== 1)) {
        await sendHelp();
        return;
      }

      if(parametro === 0) {
        if(!afkList.includes(sender)) {
          await bot.reply(from, "Você já está com o afkmode desativado!");
          return;
        }

        await updateGroupAndCache(from, {$pull: {afkList: sender}});
        await bot.reply(from, "Modo afk desativado. Notificação de adms de volta!");
        return;
      }

      if(afkList.includes(sender)) {
        await bot.reply(from, "Você já está com o afkmode ativado!");
        return;
      }

      await updateGroupAndCache(from, {$addToSet: {afkList: sender}});
      await bot.reply(from, "afkmode ativado! Agora as totags estaram silenciosas para você.");
    } catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
  }
};
