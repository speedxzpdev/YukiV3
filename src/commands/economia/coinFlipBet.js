const { users } = require("../../database/models/users");
const { desafios } = require("../../database/models/desafios");

module.exports = {
  name: "coinflipbet",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    try {
      async function sendHelp() {
        await bot.reply(from, `*Como usar comandos de economia*

Responda alguém ou mencione usando o comando junto com o valor desejado.
> Exemplo: coinflip 100 @yuki

Simples pra até pra um bebê`)
      }
      
      
      
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  || msg.message?.extendedTextMessage?.contextInfo?.participant
      
      const sender = msg?.key?.participant;
      
      const userSender = await users.findOne({userLid: sender});
      
      const userMention = await users.findOne({userLid: mention});
      
      if(!mention) {
        await sendHelp();
        return
      }
      
      const parametroMoney = Number(args[0].trim());
      
      
      
      if(!parametroMoney) {
        await sendHelp();
        return
      }
      
      if(!userMention && parametroMoney > userMention.dinheiro) {
        await bot.reply(from, "Este usuário não possui essa quantidade de moedas!")
        return
      }
      
      if(parametroMoney > userSender.dinheiro) {
        await bot.reply(from, "Você não possui esse valor!");
        return
      }
      
      if(parametroMoney > userMention.dinheiro) {
        await sock.sendMessage(from, {text: `@${mention.split("@")[0]} não possui este valor!`, mentions: [mention]}, {quoted: msg});
        return
      }
      
      const desafiopassado = await desafios.findOne({$or: [{alvo: mention}, {user: sender}]});
      
      if(desafiopassado) {
        await bot.reply(from, "Você possui uma aposta pendente.");
        return
      }
      
      await desafios.create({user: sender, alvo: mention, valor: parametroMoney});
      
      await sock.sendMessage(from, {text: `@${mention.split("@")[0]}... Você acaba de ser desafiado para um cara ou coroa por @${sender.split("@")[0]}. Responda com um: *aceitar* ou *recusar*`, mentions: [mention, sender]}, {quoted: msg});
      
      
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
}