const { users } = require("../../database/models/users.js");

module.exports = {
  name: "transferir",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    
    async function sendHelp() {
        await bot.reply(from, `*Como usar comandos de economia*

Responda alguém ou mencione usando o comando junto com o valor desejado.
> Exemplo: /transferir 100 @yuki

Simples pra até pra um bebê`)
      }
    
    try {
      
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant
      
      const sender = msg.key.participant || msg.key.remoteJid;
      
      const parametro = Number(args[0]);
      
      if(!mention) {
        await sendHelp();
        return
      }
      
      let userMention = await users.findOne({userLid: mention});
      
      const userSender = await users.findOne({userLid: sender});
      
      if(!userMention) {
        await users.create({userLid: mention, name: "sem nome"});
        
        userMention = await users.findOne({userLid: mention});
      }
      
      
      if(!parametro) {
        await sendHelp();
        return
      }
      
      if(parametro <=0) {
        await bot.reply(from, "Envie um valor maior que zero.");
        return
      }
      
    if(parametro > userSender.dinheiro) {
      await bot.reply(from, "Você não possui esse valor.");
      return
    }
    
    await bot.reply(from, `Transferindo moedas...`);
    
    //remove de quem transferiu
    await users.updateOne({userLid: sender}, {$inc: {dinheiro: -parametro}}, {upsert: true});
    
    //incrementa pro alvo
    await users.updateOne({userLid: mention}, {$inc: {dinheiro: parametro}});
      
    await sock.sendMessage(from, {text: `O @${sender.split("@")[0]} enviou ${parametro} moedas pro @${mention.split("@")[0]}!`, mentions: [sender, mention]}, {quoted: msg});
      
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
}