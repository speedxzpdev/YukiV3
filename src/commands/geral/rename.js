const { tmpdir } = require('os');
const path = require('path');
const Crypto = require('crypto');
const webp = require('node-webpmux');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');




module.exports = {
  name: "rename",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    async function sendHelp() {
      await sock.sendMessage(from, {text: `*Como renomear figurinhas usando a Yuki:*

Responda uma figurinha com /rename.

*Parâmetros:*
/rename *Nome figurinha*/*Nome pacote*

Simples. Não...?! Então morra.`}, {quoted: msg});
    }
    
    
    try {
      
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
      
      const sticker = quoted?.stickerMessage
      
      if(!sticker) {
        await sendHelp();
        return
      }
      
      const parametros = args?.join(" ").split("/");
      
      if(parametros.length < 2 || !parametros[0] || !parametros[1]) {
        await sendHelp();
        return;
      }
      
       const messageEspera = await sock.sendMessage(from, {text: "Renomeando sua figurinha..."}, {quoted: msg});
      
      const bufferFig = await downloadMediaMessage({message: {stickerMessage: sticker}}, 'buffer', {});
      
      await sock.sendMessage(from, {text: "Renomeando metadados...", edit: messageEspera.key})
      
      const metadados = {
        "sticker-pack-name": parametros[0],
        "sticker-pack-publisher": parametros[1],
        emojis: ["💕", "❤️"]
      }
      
      const header = Buffer.from([0x49, 0x49, 0x2A, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00,
    0x00, 0x00])
    
    
    const metadadosBuffer = Buffer.from(JSON.stringify(metadados), "utf8");
    
    const figExif = Buffer.concat([header, metadadosBuffer]);
    
    figExif.writeUIntLE(metadadosBuffer.length, 14, 4);
    
    const img = new webp.Image();
    
    await img.load(bufferFig);
    
    await sock.sendMessage(from, {text: "Adicionando exif na figurinha...", edit: messageEspera.key});
    
    img.exif = figExif
    
    const finalBuffer = await img.save(null);
    
      await sock.sendMessage(from, {sticker: finalBuffer}, {quoted: msg});
     
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
    
  }
}