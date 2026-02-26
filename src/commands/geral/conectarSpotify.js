const { clientRedis } = require("../../lib/redis.js");
const crypto = require("crypto");


module.exports = {
  name: "conectarspotify",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    try {
      
      const sender = msg?.key?.participant || msg?.key?.remoteJid;
      
      const state = crypto.randomBytes(32).toString("hex");
      
      await clientRedis.hSet(`idUser:${state}`, {userLid: sender});
      
      await clientRedis.expire(`idUser:${state}`, 300);
      
      await bot.reply(sender, process.env.URL_BACKEND + `/spotifyLogin?idUser=${state}`);
      
      await bot.reply(from, "Abra a url enviada no seu privado.");
      
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
}