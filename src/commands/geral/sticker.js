const { tmpdir } = require('os');
const path = require('path');
const Crypto = require('crypto');
const webp = require('node-webpmux');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs')
const { exec } = require('child_process')
const { version } = require("../../config");


module.exports = {
  name: "s",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    async function addExif(webpPath, packname = 'Yukizinha', author = 'Speed') {
  const img = new webp.Image();
  await img.load(webpPath);

  const json = {
    'sticker-pack-id': 'YukiYuki',
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    'emojis': ['✨']
  };

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00,
    0x00, 0x00
  ]);

  const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  img.exif = exif;

  const outPath = path.join(tmpdir(), `${Crypto.randomBytes(6).toString('hex')}.webp`);
  await img.save(outPath);
  return outPath;
}
  const pushname = msg.pushName || msg?.notifyName || 'Sem nome';
  const jid = msg.key.remoteJid;
  let groupName = null;


if (jid.endsWith("@g.us")) {
    const metadata = await sock.groupMetadata(jid);
    groupName = metadata.subject || "Privado." 
}
  


  const messageContent = msg.message

const context = msg.message.extendedTextMessage

const directMedia =
  msg.message.imageMessage || msg.message.videoMessage

  const quoted = messageContent?.extendedTextMessage?.contextInfo?.quotedMessage
  const quotedMedia = quoted?.imageMessage || quoted?.videoMessage || quoted?.stickerMessage


  if (!directMedia && !quotedMedia) {
    await sock.sendMessage(jid, { text: 'Por favor me envie uma foto ou responda uma!' }, { quoted: msg });
    return;
  }


  await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg})

  const mediaMsg = quotedMedia ? { message: quoted } : msg 

  let buffer;
  try {
    buffer = await downloadMediaMessage(
      mediaMsg,
      'buffer',
      {},
      { reuploadRequest: sock.updateMediaMessage }
    );
  } catch (err) {
    console.error('erro ao baixar a mídia:', err);
    await sock.sendMessage(jid, { text: erros_prontos }, { quoted: msg });
    return;
  }

  const fileName = path.join(__dirname, `../../assets/temp/${Date.now()}`);
  const inputPath = `${fileName}.jpg`;
  const outputPath = `${fileName}.webp`;

  fs.writeFileSync(inputPath, buffer);

  // Detecta se é vídeo
  const isVideo = !!(quoted?.videoMessage || msg.videoMessage);
  const filter = isVideo
    ? `"scale=512:512,fps=10"`
    : `"scale=512:512"`;

  const tempo = isVideo ? '-t 10' : '';

  const comando = `ffmpeg -i ${inputPath} -vf ${filter} -vcodec libwebp -lossless 0 -q:v 70 -loop 0 -an -vsync 0 ${tempo} ${outputPath}`;

  exec(comando, async (err) => {
    if (err) {
      console.error('❌ FFmpeg erro:', err);
      await sock.sendMessage(jid, { text: 'Falha ao converter. Envie uma imagem ou vídeo curto de até 10 segundos.' }, { quoted: msg });
      return;
    }

    try {

      
      
const time = new Date()      
const dadosfig = `🍷⃟  Yᴜᴋɪ ʙᴏᴛ 
⤷ Dᴏɴᴏ: Speed
⤷ Cʜᴀᴛ: ${groupName}
⤷ Usᴇʀ: ${pushname}`
      
const subdados = `↦ ⏱ ${time.toLocaleDateString('pt-BR')} • ${version}`
      
      const finalPath = await addExif(outputPath, dadosfig, subdados);

      const stickerBuffer = fs.readFileSync(finalPath);
      await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });

      await fs.unlinkSync(inputPath);
      await fs.unlinkSync(outputPath);
      await fs.unlinkSync(finalPath);
    } catch (e) {
      console.error('❌ Erro no EXIF:', e);
      await sock.sendMessage(jid, { text: 'Erro ao fazer figurinha. Perdão!' }, { quoted: msg });
    }
  });

    
    
  }
}
