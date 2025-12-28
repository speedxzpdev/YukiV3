const { donos } = require("../../database/models/donos");
const { numberOwner } = require("../../config");

module.exports = {
  name: "adddono",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
    
    const context = msg.message?.extendedTextMessage.contextInfo || msg.message?.conversationContextInfo || msg.message?.contextInfo
    
   const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  || msg.message?.extendedTextMessage?.contextInfo?.participant
   
    const sender = msg.key.participant
    
    if(!sender.includes("188123996786820@lid")) {
      await sock.sendMessage(from, {text: "Só o Speed pode usar este comando."}, {quoted: msg});
      return
    }
    
    if(!mention) {
      await sock.sendMessage(from, {text: "mencione alguém."}, {quoted: msg});
      return
    }
    
    if (await donos.findOne({userLid: mention})) {
      await sock.sendMessage(from, {text: "Este usuário já é dono."}, {quoted: msg});
      return
    }
    
    await donos.create({userLid: mention});
    
    await sock.sendMessage(from, {text: "Novo dono registrado com sucesso!"}, {quoted: msg});
    
    
    
    
    
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
    
    
  }
  
}