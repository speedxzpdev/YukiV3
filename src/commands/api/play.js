const axios = require("axios");
const { users } = require("../../database/models/users");
require("dotenv").config();

module.exports = {
  name: "play",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    const texto = args.slice(0).join(" ")?.trim();
      try {
    if (!texto) {
      await sock.sendMessage(from, {text: "FILHO DA PUTA BURRO DO KRL USA ESSA PORRA DIREITO SEU BOSTA"}, {quoted: msg});
      return
    }
    
    const frases = [`Buscando por ${texto}... Acalma o cu, arrombado!`, `Estou preparando um bolo enquanto busco por ${texto}...`, `${texto}...? Parece interessante, vou baixar...`];
    
    const randomFrase = frases[Math.floor(Math.random() * frases.length)];
    
    const msgEspera = await sock.sendMessage(from, {text: randomFrase}, {quoted: msg});
    
    //Busca pelo os metadados
    const response = await axios.get(`https://zero-two-apis.com.br/api/ytsrc/videos?q=${encodeURIComponent(texto)}&apikey=${process.env.ZEROTWO_APIKEY}`);
    
    //pega o primeiro resultado
    const data = response.data.resultado[0];
    
    const url = data.url
    
    const thumbnail = data.thumbnail
    
    const info = `*Yuki Youtube!*
> Autor do video:
*Nome:* ${data.author.name}
*Url:* ${data.author.url}
> Video:
*Título:* ${data.title}
*Views:* ${data.views}
*Postado:* ${data.ago}
*Duração:* ${data.timestamp}
*Descrição:* ${data.description}
`
    
    await sock.sendMessage(from, {image: {url: thumbnail}, caption: info});
    
    
    await sock.sendMessage(from, {text: "Buscando áudio...", edit: msgEspera.key});
    
    await sock.sendPresenceUpdate("recording", from);
    
    //audio
    const audio = `https://zero-two-apis.com.br/api/dl/ytaudio?url=${encodeURIComponent(url)}&apikey=${process.env.ZEROTWO_APIKEY}`;
    
    await sock.sendMessage(from, {audio: {url: audio}, mimetype: "audio/mpeg", ptt: false}, {quoted: msg});
    
    await sock.sendMessage(from, {text: "Prontinho! Aqui seu áudio", edit: msgEspera.key});
    
    await sock.sendPresenceUpdate("paused", from);
    
    await users.updateOne({userLid: msg.key.participant}, {$inc: {donwloads: 1}});
    
    
  }
  catch(err) {
    await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
    console.error("Sla oq aconteceu mais bugou", err)
  }
    
  }
}