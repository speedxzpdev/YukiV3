const { donos } = require("../../database/models/donos");


module.exports = {
  name: "promover",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      const sender = msg.key.participant
      
      const subDonu = await donos.findOne({userLid: sender})
      
      const metadados = await sock.groupMetadata(from);
     
     const Admins = metadados.participants.filter(p => p.admin);
  const groupAdmins = Admins.map(m => m.id);
  
  const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant
  
  if(!groupAdmins.includes(sender) && !subDonu) {
    await sock.sendMessage(from, {text: "Vai tomar no seu cu, seu filho da puta"}, {quoted: msg});
    return
  }
  
  if(!mention) {
    await sock.sendMessage(from, {text: "Marca alguém filho da puta"}, {quoted: msg});
    return
  }
  
  if(groupAdmins.includes(mention)) {
    await sock.sendMessage(from, {text: "Esse usuário já é admin, não fode porra"}, {quoted: msg});
    return
  }
  
  
    await sock.groupParticipantsUpdate(from, [mention], 'promote')
    
    await sock.sendMessage(from, {text: "Membro promovido com sucesso!"}, {quoted: msg});
  
      
    }
    catch(err) {
      
      const ifError = String(err);
      
      if(ifError.includes("forbidden")) {
        await sock.sendMessage(from, {text: 'Não tenho admin seu filho da puta'}, {quoted: msg});
        return
      }
      
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
    
    
  }
  
}