const { users } = require("../../database/models/users.js");

module.exports = {
  name: "rankmoedas",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    try {
      
      const msgEspera = await bot.reply(from, "Buscando rank...");
      
      const usersRank = await users.find().sort({dinheiro: -1}).limit(10)
      
      const rank = usersRank.map((item, indice) => {
        return `${indice + 1}° @${item.userLid.split("@")[0]}
⤷ *Moedas:* ${item.dinheiro}
⤷ *Quantidade de waifu:* ${item.waifus.length}`
      });
      
      await sock.sendMessage(from, {text: `*Rank de moedas Global:*\n\n${rank.join("\n\n")}`, mentions: usersRank.map(p => p.userLid)});
      
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
  }
}