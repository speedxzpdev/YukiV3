const waifus = require("../../database/waifus/waifus.json");
const preco = require("../../database/waifus/raridadePreço.json");
const { users } = require("../../database/models/users.js");
const path = require("path");
const { comprarWaifu } = require("../../utils/events.js");


module.exports = {
  name: "comprarwaifu",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    try {
      
      async function sendHelp() {
        await bot.reply(from, `Como comprar waifus:

⤷  ao usar */comprarwaifu* pegue o *id* da waifu que deseja comprar, pode fazer isso usando */loja*.
> Exemplo: /comprar waifu 20
Caso tenha o valor que custa a waifu ela será adicionada ao seu inventário.`)
      }
      
      
      const parametro = Number(args[0]);
      
      if(!parametro) {
        sendHelp();
        return
      }
      
      const waifuFind = waifus.find(item => item.id === parametro);
      
      if(!waifuFind) {
        await bot.reply(from, "Não encontrei nenhuma waifu com esse id. Use /loja para ver cada id.");
        return
      }
      
      const waifuEscolhida = {
          nome: waifuFind.nome,
          id: waifuFind.id,
          raridade: waifuFind.raridade,
          img: waifuFind.image,
          preco: preco[waifuFind.raridade]
        }
      
      const sender = msg.key.participant || msg.key.remoteJid
      
      const userSender = await users.findOne({userLid: sender});
      
      if(userSender.dinheiro < waifuEscolhida.preco) {
        await bot.reply(from, `${userSender.name}... No momento você não possui o valor suficiente para comprar a ${waifuEscolhida.nome}...`);
        return
      }
      else {
        await users.updateOne({ userLid: sender }, { $push: {waifus: { nome: waifuEscolhida.nome,
        image: waifuEscolhida.img,
        id: waifuEscolhida.id,
        raridade: waifuEscolhida.raridade,
        preco: waifuEscolhida.preco
        }
        }, $inc: {dinheiro: -waifuEscolhida.preco}});
        
        await bot.reply(from, `${waifuEscolhida.nome}, comprada com sucesso!`);
        comprarWaifu({ctx: msg, waifu: waifuEscolhida})
        
      }
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
}