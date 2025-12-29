const { numberOwner, numberBot } = require("../../config");
const { donos } = require("../../database/models/donos");

module.exports = {
  name: "add",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const sender = msg.key.participant
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant
  
     const metadados = await sock.groupMetadata(from);
     
     const Admins = metadados.participants.filter(p => p.admin);
  const groupAdmins = Admins.map(m => m.id);
  const donin = await donos.findOne({userLid: sender});
  
  
  if(!groupAdmins.includes(sender) && !donin) {
await sock.sendMessage(from, {text: "Comandos para admins."}, {quoted: msg});
return
  }
  
  if(!mention) {
    await sock.sendMessage(from, {text: "Menciona alguém zé bct."}, {quoted: msg});
    return
  }
    
    await sock.groupParticipantsUpdate(from, [mention], "add");
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
  }
}