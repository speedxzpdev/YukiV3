const { users } = require("../../database/models/users.js");


module.exports = {
  name: "disable-prefix",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    
    async function sendHelp() {
      await bot.reply(from, `*Como ativar o modo sem prefixo da Yuki:*

\`/disable-prefix 1\`
> Ativa o modo sem prefixo
\`/disable-prefix 0\`
> Desativa o modo sem prefixo`);
    }
    
    try {
      
      const sender = msg.key.participant || msg.key.remoteJid;
      
      const user = await users.findOne({userLid: sender});
      
      const argumentos = Number(args[0]);
      
      if(argumentos === undefined) {
        sendHelp();
        return
      }
      
      if(argumentos === 0) {
        if(user.prefixo) {
          await bot.reply(from, "Você já está com o modo sem prefixo desativado!");
          return
        }
        
        await users.updateOne({userLid: sender}, {$set: {prefixo: true}}, {upsert: true});
        
        await bot.reply(from, "Modo sem prefixo desativado com sucesso!");
        
      }
      else if(argumentos === 1) {
      if(!user.prefixo) {
        await bot.reply(from, "Você já está com o modo sem prefixo ativado!");
        return
      }
      
      await users.updateOne({userLid: sender}, {$set: {prefixo: false}}, {upsert: true});
      
      await bot.reply(from, "Modo sem prefixo ativado com sucesso!");
    }
    else {
      sendHelp();
    }
    
  }
  catch(err) {
    await bot.reply(from, erros_prontos);
    console.error(err);
  }
  
}
}