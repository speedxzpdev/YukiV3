const { users } = require("../../database/models/users.js");

module.exports = {
  name: "xp",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      
      const user = await users.findOne({userLid: sender});
      
      const pushname = msg?.pushName || "Sem nome";
      
      const image = `https://zero-two-apis.com.br/api/canvas/level?foto=https://files.catbox.moe/0ug48m&nome=${encodeURIComponent(pushname)}&expnow=${user?.xp}&expall=${user?.proximolevel}&level=${user?.level}&fundo=https://files.catbox.moe/b05qkn`
      
      await sock.sendMessage(from, {image: {url: image}}, {quoted: msg});
      
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
  }
}