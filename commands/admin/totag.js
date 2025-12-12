const { downloadMediaMessage } = require('@whiskeysockets/baileys')
const { donos } = require("../../database/models/donos");

module.exports = {

name: "totag",
async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
  
  const texto = args.slice(0).join(" ")?.trim();
  
  const metadados = await sock.groupMetadata(from)
  
  const Admins = metadados.participants.filter(p => p.admin)
  const groupAdmins = Admins.map(m => m.id)
  console.log(Admins)
  const sender = msg.key.participant


  if (!groupAdmins.includes(msg.key.participant) && !await donos.findOne({userLid: sender})) {
    await sock.sendMessage(from, {text: "Entrosa n mlk", mentions: ["188123996786820@lid"]}, {quoted: msg})
    return
  }
  

  const seloTotag = {
    key: {
      remoteJid: from,
      id: 'yuki123',
      fromMe: false,
      participant: '0@s.whatsapp.net'},
      message: {
        extendedTextMessage: {text: `*🫟𝐆𝐫𝐮𝐩𝐨:* ${metadados.subject}
*🪻𝐛𝐨𝐭:* 
*💜 𝐕𝐞𝐫𝐬ã𝐨:* `}
        
      }
    }
  
  
  const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
  
  const msg_quoted = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.documentMessage?.caption || texto
  
  const foto = quoted?.imageMessage
  
  const video = quoted?.videoMessage
  
  const sticker = quoted?.stickerMessage
  
  
 const metadata = await sock.groupMetadata(from)
const todos = metadata.participants.map(p => p.id)
  
  if (foto) {
    const imgDl = await downloadMediaMessage({message: {imageMessage: foto}}, 'buffer', {})
    await sock.sendMessage(from, { image: imgDl, mentions: todos}, { quoted: seloTotag })
    return
  }
  
  if (video) {
  const videoDl = await downloadMediaMessage({message: {videoMessage: video}}, 'buffer', {})
  
  await sock.sendMessage(from, { video: videoDl, mentions: todos}, { quoted: seloTotag })
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