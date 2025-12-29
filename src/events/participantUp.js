const { grupos } = require("../database/models/grupos");



module.exports = (sock) => {
  
  sock.ev.on("group-participants.update", async(update) => {
    
    const from = update.id
    
    const groupsDb = await grupos.findOne({groupId: from});
    
    if (groupsDb?.configs?.welcome) {
      const action = update.action
      
      if(action === "add") {
        
        const senderAdd = update.participants[0].id
        
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
        }
      }
      
      
      
      
      
    }
    
    
  })
  
}