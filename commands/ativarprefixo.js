const { users } = require("../database/models/users");

module.exports = {
  name: "ativarprefixo",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const param = args[0]
      
      const sender = msg.key.participant || msg.key.remoteJid
      
      const userFind = await users.findOne({userLid: sender});
      
      if(!userFind) {
        await users.create({userLid: sender});
      }
      await users.updateOne({userLid: sender}, {$set: {prefixo: true}});
      
      await sock.sendMessage(from, {text: "Prefixo ativado! Porra!"}, {quoted: msg});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
    
  }
}