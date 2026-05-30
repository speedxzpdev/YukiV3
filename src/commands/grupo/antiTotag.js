const { ensureGroup, getGroupPermission, updateGroupAndCache } = require("../../utils/dbHelpers");

module.exports = {
  name: "antimarcar",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
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
      
      const { metadata, allowed } = await getGroupPermission(sock, from, sender);
      
      if (!allowed) {
        await bot.sendNoAdmin();
        return
      }
      
      await ensureGroup(from, metadata);
      
      const options = args[0]?.trim();
      
      if(!options) {
        await sendHelp()
        return
      }
      
      if(options === "0") {
        await updateGroupAndCache(from, {$set: {antiTotag: false}}, {metadata});
        
        await bot.reply(from, "Anti marcação desativado com sucesso. Agora podem fazer a festa!");
        return
      }
      
      else if(options === "1") {
        await updateGroupAndCache(from, {$set: {antiTotag: true}}, {metadata});
        
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
