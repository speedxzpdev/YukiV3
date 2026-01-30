const axios = require("axios");


async function spotifyDl(sock, msg, from, body, erros_prontos, espera_pronta, bot) {
  try {
    
    const EsperaMsg = bot.reply(from, espera_pronta);
    
    const response = await axios.get(`https://zero-two-apis.com.br/api/spotify/preview?url=${body}&apikey=${process.env.ZEROTWO_APIKEY}`);
    
    const data = response.data.resultado
    
    console.log(data);
    
    const info = `*Yuki Spotify/Preview*
⤷ *Título:* ${data.title}
⤷ *Artista:* ${data.artist}
⤷ *Tipo:* ${data.type}
⤷ *Data:* ${new Date(data.date).toLocaleDateString("pt-BR")}
`
    
    await sock.sendMessage(from, {image: {url: data.image}, caption: info}, {quoted: msg});
    
    await bot.editReply(from, espera_pronta.key, 'Enviando melhor áudio!');
    
    await sock.sendMessage(from, {audio: {url: data.audio}, mimetype: "audio/mp3", ptt: false}, {quoted: msg});
    
  }
  catch(err) {
    await bot.reply(from, erros_prontos);
    console.error(err);
  }
  
}

module.exports = spotifyDl