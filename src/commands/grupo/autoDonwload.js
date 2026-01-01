const { grupos } = require("../../database/models/grupos");
const { donos } = require("../../database/models/donos");

module.exports = {
  name: "autodownload",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
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
      
      const metadata = await sock.groupMetadata(from);
      
      const isAdmin = metadata.participants.filter(p => p.admin).map(p => p.id);
      
      const sender = msg.key.participant
      
      const donim = await donos.findOne({userLid: sender});
      
      if (!isAdmin.includes(sender) && !donim) {
        await sock.sendMessage(from, {text: "Comando restrito a admins"}, {quoted: msg});
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
        await grupos.updateOne({groupId: from}, {$set: {autoDownload: false}});
        
        await sock.sendMessage(from, {text: "Auto download desativado com sucesso!"}, {quoted: msg});
        return
      }
      
      else if(options === "1") {
        await grupos.updateOne({groupId: from}, {$set: {autoDownload: true}});
        
        await sock.sendMessage(from, {text: "Auto donwload ativado!"}, {quoted: msg});
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