const { users } = require("../../database/models/users");


module.exports = {
  name: "mudarbio",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const sender = msg.key.participant
      
      if(!await users.findOne({userLid: sender})) {
        await users.create({userLid: sender});
      }
      
      const bioText = args?.join(" ")?.trim();
      
      if(!bioText) {
        await sock.sendMessage(from, {text: `Coloque a bio desejada. Exemplo: "/mudarbio Eu amo o Speed"`}, {quoted: msg});
        return
      }
      
      await sock.sendMessage(from, {text: "Mudando bio..."}, {quoted: msg});
      
      await users.updateOne({userLid: sender}, {$set: {bio: bioText}});
      
      await sock.sendMessage(from, {text: `Bio mudada para: "${bioText}", use /perfil para ver alterações.`}, {quoted: msg});
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
    
  }
}