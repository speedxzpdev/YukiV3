const axios = require("axios");
const { users } = require("../database/models/users");
const path = require("path");
const { normalizeUserLid } = require("./normalizeUserLid");

async function tiktokDl(sock, msg, from, body, erros_prontos, espera_pronta) {
  try {
  /*if(args === 0) {
    await sock.sendMessage(from, {text: "Falta o parametro link!"});*/

    
    const url = `https://zero-two-apis.com.br/api/download/tiktok?url=${body}&apikey=${process.env.ZEROTWO_APIKEY}`

    const response = await axios.get(url);
    const result = response.data.resultado
    const infovd = result.statistics
    
    async function baixar() {
    
    await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
    await sock.sendMessage(from, {sticker: {url: path.join(__dirname, "../assets/images/stickers/chibiConfiante.webp")}}, {quoted: msg});

    
    const legenda = `𝗬𝘂𝗸𝗶 𝗧𝗶𝗸𝘁𝗼𝗸!
⤷ *Nick*: ${result.author.nickname}
⤷ *User*: ${result.author.username}
⤷ *Bio*: ${result.author.signature}
⤷ *Url do perfil*: ${result.author.url}

> Informações - Post
⤷ *Título*: ${result.desc.replace(/#[^\s]+/g, '').trim()}
⤷ *Tipo*: ${result.type}
⤷ *Região*: ${result.author.region}
⤷ *Resolução*: ${result.video?.ratio? result.video.ratio : 'Indefinido'}
⤷ *duração*: ${result.video?.duration? result.video.duration : 'indefinido'}

> Estatisticas - Post
⤷ *Likes*: ${infovd.likeCount}
⤷ *Vizualizações*: ${infovd.playCount}
⤷ *Comentários*: ${infovd.commentCount}
⤷ *Compartilhamentos*: ${infovd.shareCount}
⤷ *Hashtags*: ${result.hashtag}

> 🎶Informações da musica
⤷ *Id*: ${result.music.id}
⤷ *Titulo*: ${result.music.title}
⤷ *Album*: ${result.music.album}
⤷ *duração*: ${result.music.duration}
⤷ *Comercial?* ${result.music.isOriginalSound ? 'Sim' : 'Não'}
⤷ *Som original?* ${result.music.isOriginalSound ? 'Sim' : 'Não'}`

const sender = normalizeUserLid(
  msg?.key?.participantLid ||
  msg?.key?.senderLid ||
  msg?.key?.participant ||
  msg?.key?.remoteJid
);

await users.updateOne({userLid: sender}, {$inc: {donwloads: 1}});

if(result.type === 'image') {
  const images = result.images

  for (let imgs of images) {

    await sock.sendMessage(from, {image: {url: imgs}, caption: legenda}, {quoted: msg})
  }
  await sock.sendMessage(from, {text: "Baixando o melhor áudio!"}, {quoted: msg});
await sock.sendMessage(from, {audio: {url: result.music.playUrl[0]}, mimetype: "audio/mp3", ptt: false}, {quoted: msg});
  return
}




await sock.sendMessage(from, {video: {url: result.video.playAddr[0]}, caption: legenda}, {quoted: msg});

await sock.sendMessage(from, {text: "Baixando o melhor áudio!"}, {quoted: msg});

await sock.sendMessage(from, {audio: {url: result.music.playUrl[0]}, mimetype: "audio/mp4"}, {quoted: msg});

}

return {
  baixarDl: baixar,
  audio: result.music.playUrl[0],
  nome: result.author.nickname,
  duracao: result.video?.duration? result.video.duration : 'indefinido',
  titulo: result.desc.replace(/#[^\s]+/g, '').trim(),
  avatar: result.author.avatarMedium
}

}
catch(err) {
  await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
  console.error(err);
}


  }


module.exports = tiktokDl
