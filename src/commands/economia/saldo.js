const { users } = require("../../database/models/users");

module.exports = {
  name: "saldo",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
    
    await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
    
    const senderLid = msg.key.participant || msg.key.remoteJidAlt
    
    let userFind = await users.findOne({userLid: senderLid});
    
    if(!userFind) {
      await users.create({userLid: msg.key.participant || msg.key.remoteJid, name: msg.pushName || "Sem nome"});
    }
  
  await sock.sendMessage(from, {text: `${msg.pushName || "sem nome"}, você tem ${userFind.dinheiro} de saldo.`}, {quoted: msg});
  
  
    
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg})
      console.error(err)
    }
    
    
    
    
    
  }
  
  
  
}