const { ensureUser, updateUserAndCache } = require("../../utils/dbHelpers");

module.exports = {
  name: "disable-prefix",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    async function sendHelp() {
      await bot.reply(from, `*Como ativar o modo sem prefixo da Yuki:*

\`/disable-prefix 1\`
> Ativa o modo sem prefixo
\`/disable-prefix 0\`
> Desativa o modo sem prefixo`);
    }

    try {
      const user = await ensureUser(sender, msg.pushName || "Sem nome");
      const argumentos = Number(args[0]);

      if(args[0] === undefined) {
        await sendHelp();
        return;
      }

      if(argumentos === 0) {
        if(user.prefixo) {
          await bot.reply(from, "Você já está com o modo sem prefixo desativado!");
          return;
        }

        await updateUserAndCache(sender, {$set: {prefixo: true}});
        await bot.reply(from, "Modo sem prefixo desativado com sucesso!");
        return;
      }

      if(argumentos === 1) {
        if(!user.prefixo) {
          await bot.reply(from, "Você já está com o modo sem prefixo ativado!");
          return;
        }

        await updateUserAndCache(sender, {$set: {prefixo: false}});
        await bot.reply(from, "Modo sem prefixo ativado com sucesso!");
        return;
      }

      await sendHelp();
    } catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
  }
};
