const { grupos } = require("../../database/models/grupos.js");


module.exports = {
  name: "afkmode",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    async function sendHelp() {
  await sock.sendMessage(from, {
    text: `*Como usar comandos de opção:*\n0 - Desativado | Desligado\n>\nExemplo: "/welcome 0"\n1 - Ativado | Ligado\n> Exemplo: "/welcome 1"`
  }, { quoted: msg });
}
    try {
      
      if(!from.endsWith("@g.us")) {
        await bot.reply(from, "Use esse comando em um grupo!");
        return
      }
      
      
      
      const grupo = await grupos.findOne({groupId: from});
      const afkList = Array.isArray(grupo?.afkList) ? grupo.afkList : [];
      const rawParam = args?.[0];

      if(rawParam === undefined) {
        await sendHelp();
        return
      }
      
      const parametro = Number(rawParam);
      
      if(!Number.isInteger(parametro) || (parametro !== 0 && parametro !== 1)) {
        await sendHelp();
        return
      }
      
      //desativa o modo afk
      if(parametro === 0) {
        if(!afkList.includes(sender)) {
          await bot.reply(from, "Você já está com o afkmode desativado!");
          return
        }
        
        await grupos.updateOne({groupId: from}, {$pull: {afkList: sender}}, {upsert: true});
        
        await bot.reply(from, "Modo afk desativado. Notificação de adms de volta!");
      }
      
      else if(parametro === 1) {
        if(afkList.includes(sender)) {
          await bot.reply(from, "Você já está com o afkmode ativado!");
          return
        }
        
        await grupos.updateOne({groupId: from}, {$addToSet: {afkList: sender}}, {upsert: true});
        
        await bot.reply(from, "afkmode ativado! Agora as totags estaram silenciosas para você.");
        
      }
      else {
        await sendHelp();
      }
      
      
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
}
