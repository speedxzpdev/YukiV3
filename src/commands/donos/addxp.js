const { users } = require("../../database/models/users.js");
const { donos } = require("../../database/models/donos.js")
const addXp = require("../../utils/xp.js");


module.exports = {
  name: "addxp",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  || msg.message?.extendedTextMessage?.contextInfo?.participant
  
  const level = args[0];
      
       if(!await donos.findOne({userLid: sender})) {
        await sock.sendMessage(from, {text: "Comando exclusivo para SubDonos."}, {quoted: msg});
        return
      }
      
      if(!level || !mention) {
        await bot.reply(from, "Cade o xp desgraca");
        return
      }
      
      addXp(mention, level, sock, from, msg)
      
    }
    catch(err) {
      await bot.reply(from, "Erro.");
      console.error(err);
    }
  }
  
}