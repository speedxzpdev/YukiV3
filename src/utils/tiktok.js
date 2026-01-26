const axios = require("axios");
const { users } = require("../database/models/users");
require("dotenv").config();

async function tiktokDl(sock, msg, from, body, erros_prontos, espera_pronta) {
  try {
  /*if(args === 0) {
    await sock.sendMessage(from, {text: "Falta o parametro link!"});*/
    
    await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
    
    
    const url = `https://zero-two-apis.com.br/api/download/tiktok?url=${body}&apikey=${process.env.ZEROTWO_APIKEY}`
    
    const response = await axios.get(url);
    const result = response.data.resultado
    const stats = result.stats
    
    const legenda = `𝗬𝘂𝗸𝗶 𝗧𝗶𝗸𝘁𝗼𝗸!
⤷ *User*: ${result?.author?.nickname} - ${result?.author?.fullname}
> Informações - Video
⤷ *Título*: ${result?.title.replace(/#[^\s]+/g, '').trim()}
⤷ *Região*: ${result?.region}
⤷ *duração*: ${result?.duration ?? 'indefinido'}

> Estatisticas - Post
⤷ *Likes*: ${stats?.likes}
⤷ *Vizualizações*: ${stats?.views}
⤷ *Comentários*: ${stats?.comment}
⤷ *Compartilhamentos*: ${stats?.share}
⤷ Downloads: ${stats?.download}
⤷ *Hashtags*: ${stats?.hashtag}

> 🎶Informações da musica
⤷ *Id*: ${result?.music?.id}
⤷ *Titulo*: ${result?.music?.title}
⤷ *Autor*: ${result?.music?.author}
⤷ *Album*: ${result?.music?.album}`

await users.updateOne({userLid: msg.key.participant}, {$inc: {donwloads: 1}});

if(result.slides) {
  const images = result.slides
  
  for (let imgs of images) {
    
    await sock.sendMessage(from, {image: {url: imgs}, caption: legenda}, {quoted: msg})
  }
  await sock.sendMessage(from, {text: "Baixando o melhor áudio!"}, {quoted: msg});
await sock.sendMessage(from, {audio: {url: result.music.url}, mimetype: "audio/mp3", ptt: false}, {quoted: msg});
  return
}




await sock.sendMessage(from, {video: {url: result.video.nowm_hd}, caption: legenda}, {quoted: msg});

await sock.sendMessage(from, {text: "Baixando o melhor áudio!"}, {quoted: msg});

await sock.sendMessage(from, {audio: {url: result.music.url}, mimetype: "audio/mp3"}, {quoted: msg});

}
catch(err) {
  await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
  console.error(err);
}
    
    
  }
  
  
module.exports = tiktokDl