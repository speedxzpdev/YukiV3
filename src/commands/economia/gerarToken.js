const { clientRedis } = require("../../lib/redis.js");
const crypto = require("crypto");

module.exports = {
  name: "gerartoken",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    try {
      
      const sender = msg.key.participant || msg.key.remoteJid;
      
      const existeToken = await clientRedis.exists(`userToken:${sender}`);
      
      if(existeToken) {
        await bot.reply(from, "Você já possui um token pendente, olhe seu privado ou tente gerar outro mais tarde.");
        return;
      }
      
      const msgEspera = await bot.reply(from, "Gerando token...");
      
      const token = crypto.randomBytes(32).toString("hex");
      
      await clientRedis.set(`token:${token}`, sender, { EX: 300 });
      
      await clientRedis.set(`userToken:${sender}`, token, { EX:300 });
      
      const msgToken = await bot.reply(sender, token);
      
      await bot.reply(sender, "Use esse token para criar sua conta no site da yuki, esse token expira em 5 minutos, *não passe pra ninguém.*", msgToken);
      
      await bot.editReply(from, msgEspera.key, "Token enviado no seu privado!");
      
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
}