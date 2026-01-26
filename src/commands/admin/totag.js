const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { donos } = require("../../database/models/donos");
const { grupos } = require("../../database/models/grupos.js");

module.exports = {

name: "totag",
async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
  
  const texto = args.slice(0).join(" ")?.trim();
  
  const metadados = await sock.groupMetadata(from)
  
  const Admins = metadados.participants.filter(p => p.admin)
  const groupAdmins = Admins.map(m => m.id)
  const sender = msg.key.participant


  if (!groupAdmins.includes(msg.key.participant) && !await donos.findOne({userLid: sender})) {
    await bot.sendNoAdmin(from);
    return
  }
  

  const seloTotag = {
    key: {
      remoteJid: from,
      id: 'yuki123',
      fromMe: false,
      participant: msg.key.participant},
      message: {
        extendedTextMessage: {text: `⤷ ❄️ Mᴀʀᴄᴀᴄ̧ᴀ̃ᴏ ᴅᴏ ᴀᴅᴍɪɴ: ${msg.pushName}\n• Caso não queira ser marcado use: */afkmode 1*`}
        
      }
    }
  
  
  const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
  
  const msg_quoted = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.documentMessage?.caption || texto
  
  const foto = quoted?.imageMessage
  
  const video = quoted?.videoMessage
  
  const sticker = quoted?.stickerMessage
  
  const enquete = quoted?.pollCreationMessageV3
  
  
 const metadata = await sock.groupMetadata(from);
 
 const grupo = await grupos.findOne({groupId: from});
 
 const afkList = grupo?.afkList ?? [];

const todos = metadata.participants.map(p => p.id).filter(p => {
  return !afkList.includes(p);
});
  
  if (foto) {
    const imgDl = await downloadMediaMessage({message: {imageMessage: foto}}, 'buffer', {})
    await sock.sendMessage(from, { image: imgDl, caption: foto.caption, mentions: todos}, { quoted: seloTotag })
    return
  }
  
  if (video) {
  const videoDl = await downloadMediaMessage({message: {videoMessage: video}}, 'buffer', {})
  
  await sock.sendMessage(from, { video: videoDl, caption: video.caption, mentions: todos}, { quoted: seloTotag })
  return
  }
  
  if (sticker) {
    const stickerDl = await downloadMediaMessage({message: {stickerMessage: sticker}}, 'buffer', {})
    
    await sock.sendMessage(from, { sticker: stickerDl, mentions: todos}, { quoted: seloTotag })
    return
  }
  if (msg_quoted) {
    
    await sock.sendMessage(from, { text: msg_quoted, mentions: todos}, { quoted: seloTotag})
    return
  }
  
  if (!msg_quoted) {
    await sock.sendMessage(from, { text: texto, mentions: todos}, { quoted: seloTotag })
    return
  }



  else {
    await sock.sendMessage(from, {text: "Responda uma mensagem ou digite algo!"}, {quoted: msg})
    return
  }
  
  
  
}

}