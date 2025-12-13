const fs = require("fs");
const path = require("path");
const { numberOwner } = require("../../config")


module.exports = {
  name: "get",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
    const caminho = args[0]
    const proibidos = [".env", ".json", ".sh"]
    const sender = msg.key.participant || msg.key.remoteJid
    
    if(!sender.includes(numberOwner)) {
      await sock.sendMessage(from, {text: "Só o Lenzo e o Ispidi podem usar esse comando!"}, {quoted: msg});
      return
    }
    
    if(!caminho) {
      await sock.sendMessage(from, {text: "digita o caminho pau no cu"}, {quoted: msg});
      return
    }
    
    if(!fs.existsSync(caminho)) {
      await sock.sendMessage(from, {text: "Digita um caminho válido, zé bct"}, {quoted: msg});
      return
    }
    
    if(proibidos.some(p => caminho.endsWith(p))) {
      await sock.sendMessage(from, {text: "Esses arquivo não mando nem fudendo, pau no cu!"}, {quoted: msg});
      return
    }
    
    
    await sock.sendMessage(from, {document: {url: caminho}, mimetype: "application/javascript", fileName: path.basename(caminho)}, {quoted: msg});
    
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
    
    
  }
}