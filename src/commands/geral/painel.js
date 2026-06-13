const crypto = require("crypto");
const { clientRedis } = require("../../lib/redis.js");

module.exports = {
  name: "painel",
  categoria: "padrao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const baseUrl = process.env.URL_BACKEND;

      if(!baseUrl) {
        await bot.reply(from, "URL do painel nao configurada.");
        return;
      }

      const existeToken = await clientRedis.exists(`userToken:${sender}`);

      if(existeToken) {
        await bot.reply(from, "Voce ja tem um link pendente no privado. Ele expira em 5 minutos.");
        return;
      }

      const msgEspera = await bot.reply(from, "Gerando link do painel...");
      const token = crypto.randomBytes(32).toString("hex");

      await clientRedis.set(`token:${token}`, sender, {EX: 300});
      await clientRedis.set(`userToken:${sender}`, token, {EX: 300});

      const url = new URL("/painel", baseUrl);
      url.searchParams.set("token", token);

      await bot.reply(sender, `Seu painel da Yuki: ${url.toString()}\n\nEsse link expira em 5 minutos e funciona uma vez so.`);
      await bot.editReply(from, msgEspera.key, "Link do painel enviado no seu privado!");
    } catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
  }
};
