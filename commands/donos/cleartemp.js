const fs = require("fs").promises
const { donos } = require("../../database/models/donos");

module.exports = {
  name: "cleartemp",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    try {
      const sender = msg.key.participant
      
      const doninhos = await donos.findOne({userLid: sender})
      
      if(!doninhos) {
        await sock.sendMessage(from, {text: "Comando exlusivo para donos!"}, {quoted: msg});
        return
      }
      
      await fs.rm("../assets/temp", {recursive: true, force: true});
      
      await sock.sendMessage(from, {text: "Pasta temp apagada!"}, {quoted: msg});
      
      
      await fs.mkdir("../assets/temp", {recursive: true});
      
      await sock.sendMessage(from, {text: "Pasta temp recriada!"}, {quoted: msg});
      
      
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
  }
}