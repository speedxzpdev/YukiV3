const { grupos } = require("../../database/models/grupos");
const { donos } = require("../../database/models/donos");

module.exports = {
  name: "antimarcar",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    async function sendHelp() {
  await sock.sendMessage(from, {
    text: `*Como usar comandos de opção:*\n/antimarcar 0\n> Desativado\n/antimarcar 1\n> Ativado`
  }, { quoted: msg });
}
    
    try {
      
      if (msg.key.remoteJid.endsWith("@lid")) {
        await sock.sendMessage(from, {text: "Use esse comando dentro de um grupo."}, {quoted: msg});
        return
      }
      
      const metadata = await sock.groupMetadata(from);
      
      const isAdmin = metadata.participants.filter(p => p.admin).map(p => p.id);
      
      const sender = msg.key.participant
      
      const donim = await donos.findOne({userLid: sender});
      
      if (!isAdmin.includes(sender) && !donim) {
        await bot.sendNoAdmin();
        return
      }
      
      const grupoDb = await grupos.findOne({groupId: from});
      
      
      if (!grupoDb) {
        await grupos.create({groupId: from});
      }
      
      const options = args[0]?.trim();
      
      if(!options) {
        await sendHelp()
        return
      }
      
      if(options === "0") {
        await grupos.updateOne({groupId: from}, {$set: {antiTotag: false}}, {upsert: true});
        
        await bot.reply(from, "Anti marcação desativado com sucesso. Agora podem fazer a festa!");
        return
      }
      
      else if(options === "1") {
        await grupos.updateOne({groupId: from}, {$set: {antiTotag: true}}, {upsert: true});
        
       await bot.reply(from, "Anti marcação ativada. Chega de bagunça!");
        return
      }
      
      else {
        await sendHelp();
return
      }
      
      
      
      
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
    
  }
  
}