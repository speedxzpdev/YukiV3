const { donos } = require("../../database/models/donos");

module.exports = {
  name: "seradmin",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      const sender = msg.key.participant
      const dono = await donos.findOne({userLid: sender});
      
      if(!dono) {
        await sock.sendMessage(from, {text: "Você é dono? Seu filho da puta"}, {quoted: msg});
        return
      }
      
      await sock.groupParticipantsUpdate(from, [sender], 'promote');
      
      await sock.sendMessage(from, {text: "Dono promovido com sucesso!"});
    }
    catch(err) {
      const ifErr = String(err);
      
      if(ifErr.includes("forbidden")) {
        await sock.sendMessage(from, {text: "Não possuo admin."}, {quoted: msg});
        return
      }
      
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
    
  }
}