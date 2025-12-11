

module.exports = {
  name: "d",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const msgquoted = msg.message.extendedTextMessage.contextInfo
      
       await sock.sendMessage(from, {delete: {
         remoteJid: from,
         fromMe: false,
         id: msgquoted.stanzaId,
         participant: msgquoted.participant || undefined
       }});
       

      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
  }
  
}