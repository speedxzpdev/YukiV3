const waifus = require("../../database/waifus/waifus.json");
const preco = require("../../database/waifus/raridadePreço.json");

module.exports = {
  name: "loja",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      
      const msgAwait = await bot.reply(from, "Buscando loja de waifus...");
      
      const arrayWaifu = waifus.filter((r) => {return r.raridade !== "exclusiva" && r.raridade !== "secreto"}).map((item, indice) => {
        return {
          waifu: item.nome,
          raridade: item.raridade,
          id: item.id,
          preco: preco[item.raridade]
        }
      });
      
      
      const waifuList = arrayWaifu.sort((antes, depois) => { return depois.preco - antes.preco}).map((item, indice) => {
        return `🌹*Nome:* ${item.waifu}
⤷ 🔥*Raridade:* ${item.raridade}
⤷ 💰*Preço:* ${item.preco}
⤷ ✨*Id:* ${item.id}`
      });
      
      bot.editReply(from, msgAwait.key, `🌸 *Loja de waifus:*\n\n ${waifuList.join("\n\n")}\n\nUse: /comprarwaifu <id>`);
      
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
}