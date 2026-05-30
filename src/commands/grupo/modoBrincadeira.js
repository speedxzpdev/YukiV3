const { ensureGroup, getGroupPermission, updateGroupAndCache } = require("../../utils/dbHelpers");

module.exports = {
  name: "modobrincadeira",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    async function sendHelp() {
  await sock.sendMessage(from, {
    text: `*Como usar comandos de opção:*\n0 - Desativado | Desligado\n>\nExemplo: "/welcome 0"\n1 - Ativado | Ligado\n> Exemplo: "/welcome 1"`
  }, { quoted: msg });
}
    
    try {
      
      if (msg.key.remoteJid.endsWith("@lid")) {
        await sock.sendMessage(from, {text: "Use esse comando dentro de um grupo."}, {quoted: msg});
        return
      }
      
      const { metadata, allowed } = await getGroupPermission(sock, from, sender);
      
      if (!allowed) {
        await sock.sendMessage(from, {text: "Comando restrito a admins"}, {quoted: msg});
        return
      }
      
      await ensureGroup(from, metadata);
      
      const options = args[0]?.trim();
      
      if(!options) {
        await sendHelp()
        return
      }
      
      if(options === "0") {
        await updateGroupAndCache(from, {$set: {"configs.cmdFun": false}}, {metadata});
        
        await sock.sendMessage(from, {text: "Modo brincadeira desativado!"}, {quoted: msg});
        return
      }
      
      else if(options === "1") {
        await updateGroupAndCache(from, {$set: {"configs.cmdFun": true}}, {metadata});
        
        await sock.sendMessage(from, {text: "Modo brincadeira ativo!"}, {quoted: msg});
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
