const { ensureUser, invalidateUser, updateUserAndCache } = require("../../utils/dbHelpers");

module.exports = {
  name: "transferir",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    async function sendHelp() {
      await bot.reply(from, `*Como usar comandos de economia*

Responda alguém ou mencione usando o comando junto com o valor desejado.
> Exemplo: /transferir 100 @yuki

Simples pra até pra um bebê`);
    }

    try {
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant;
      const parametro = Number(args[0]);

      if(!mention || !parametro) {
        await sendHelp();
        return;
      }

      if(parametro <=0) {
        await bot.reply(from, "Envie um valor maior que zero.");
        return;
      }

      await Promise.all([
        ensureUser(sender, msg.pushName || "Sem nome"),
        ensureUser(mention, "sem nome")
      ]);

      const debit = await updateUserAndCache(
        sender,
        {$inc: {dinheiro: -parametro}},
        {filter: {dinheiro: {$gte: parametro}}}
      );

      if(!debit) {
        invalidateUser(sender);
        await bot.reply(from, "Você não possui esse valor.");
        return;
      }

      try {
        await updateUserAndCache(mention, {$inc: {dinheiro: parametro}});
      } catch (err) {
        await updateUserAndCache(sender, {$inc: {dinheiro: parametro}});
        throw err;
      }

      await sock.sendMessage(from, {text: `O @${sender.split("@")[0]} enviou ${parametro} moedas pro @${mention.split("@")[0]}!`, mentions: [sender, mention]}, {quoted: msg});
    } catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
  }
};
