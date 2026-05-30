const { users } = require("../../database/models/users.js");
const { donos } = require("../../database/models/donos.js");

module.exports = {
  name: "rankmoedas",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    try {
      const msgEspera = await bot.reply(from, "Buscando rank...");

      const dono = await donos.find().lean();
      const donosIds = dono.map((i) => i.userLid);

      const usersRank = await users.find({ userLid: { $nin: donosIds } }).sort({ dinheiro: -1 }).limit(10).lean();

      const rank = usersRank.map((item, indice) => {
        return `${indice + 1}° @${item.userLid.split("@")[0]}\n⤷ *Moedas:* ${item.dinheiro}\n⤷ *Quantidade de waifu:* ${item.waifus.length}`;
      });

      await sock.sendMessage(from, { text: `*Rank de moedas Global:*\n\n${rank.join("\n\n")}`, mentions: usersRank.map((p) => p.userLid) });
    } catch (err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
  }
};
