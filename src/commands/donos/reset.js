const { donos } = require("../../database/models/donos");


module.exports = {
  name: "reset",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const sender = msg.key.participant || msg.key.remoteJid
      
      const donoSender = await donos.findOne({userLid: sender});
      
      if(!donoSender) {
        await sock.sendMessage(from, {text: "Tu não é dono, viadinho!"}, {quoted: msg});
        return;
      }
      
      await sock.sendMessage(from, {text: "Irei reiniciar em 3 segundos..."});
      
      setTimeout(() => process.exit(), 3000);
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
  }
}