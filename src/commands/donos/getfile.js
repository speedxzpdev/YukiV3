const fs = require("fs");
const path = require("path");
const { numberOwner } = require("../../config")
const { donos } = require("../../database/models/donos.js");

module.exports = {
  name: "getfile",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    try {
    const caminho = args[0]
    const proibidos = [".env", ".json", ".sh"]
    const sender = msg.key.participant || msg.key.remoteJid
    const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant
    
    const donoSender = await donos.findOne({userLid: sender});
    
    if(!donoSender) {
      await sock.sendMessage(from, {text: "Só o Sub-Donos podem usar esse comando."}, {quoted: msg});
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
    
    if(mention) {
      const esperaM = await bot.reply(from, "Enviando arquivo pro usuário...");
      await sock.sendMessage(mention, {document: {url: caminho}, mimetype: "application/javascript", fileName: path.basename(caminho), caption: `O @${sender.split("@")[0]} Me pediu pra enviar esse arquivo pra você!`, mentions: [sender]});
      
      await bot.editReply(from, esperaM.key, "Arquivo enviado com sucesso!");
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