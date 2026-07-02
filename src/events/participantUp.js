const { ensureGroup } = require("../utils/dbHelpers");
const { removeBlockedParticipantsFromGroup } = require("../utils/blockedParticipants");



module.exports = (sock) => {
  
  sock.ev.on("group-participants.update", async(update) => {
    
    console.log(update);
    
    if(process.env.DEV_AMBIENT === "true") return
    
    const from = update.id
    
    const metadata = await sock.groupMetadata(from);

    try {
      const removedBlocked = await removeBlockedParticipantsFromGroup(sock, from, metadata);
      if (removedBlocked && update.action === "add") return;
    } catch (err) {
      console.error("Erro ao remover participante bloqueado:", err?.data || err?.message || err);
    }
    
    const groupsDb = await ensureGroup(from, metadata);
    
    if (groupsDb?.configs?.welcome) {
      const action = update.action
      
      if(action === "add") {
        
        const senderAdd = update.participants[0]

        if(!senderAdd) return;
        
        await sock.sendMessage(from, {text: `Seja bem-Vindo, @${senderAdd.split("@")[0]}. Meu nome é Yuki, Caso queira usar meus comandos, use /menu`, mentions: [senderAdd]});
      }
      
      if(action === "remove") {
        
        const author = update.author
        
        const sender = update.participants[0].id
        
        if(sender === author) {
          await sock.sendMessage(from, {text: `Que pena... @${sender.split("@")[0]}, saiu do grupo...`, mentions: [sender]});
          return
        }
        
        else {
          await sock.sendMessage(from, {text: `Eita que tensão! @${author.split("@")[0]} removeu @${sender.split("@")[0]}`, mentions: [sender, author]});
          
          await sock.sendMessage(sender, {text: `@${sender.split("@")[0]} você foi removido do grupo: ${metadata.subject}\n⤷ Removido em: ${new Date().toLocaleDataString("pt-BR")}\n⤷ Por: @${author.split("@")[0]}`, mentions: [author, sender]})
        }
      }
      
      
      
      
      
    }
    
    
  })
  
}
