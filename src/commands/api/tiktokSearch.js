const axios = require("axios");
require("dotenv").config();

module.exports = {
  name: "tiktoksearch",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const parametro = args?.join(" ").trim();
      
      if(!parametro) {
        await sock.sendMessage(from, {text: "Cadê o parâmetro pesquisa?! Use: /tiktoksearch <username>"}, {quoted: msg});
        return
      }
      
      const ListMsg = [`Buscando por ${parametro}, como se fosse um bolinho! 🧁`, `Procurando ${parametro}, hum... Conectando cabos...`, `${parametro}, parece algo interessante... Já volto!`, `Procurando ${parametro}, só um momento... Estou fazendo bolinhos! 🍰`];
      
      const randomEspera = ListMsg[Math.floor(Math.random() * ListMsg.length)];
      
      await sock.sendMessage(from, {text: randomEspera}, {quoted: msg});
      
      const response = await axios.get(`https://zero-two-apis.com.br/download/tiktoksearch?username=${encodeURIComponent(parametro)}&apikey=${process.env.ZEROTWO_APIKEY}`);
      
      const data = response.data.resultado
      
      const info = `*Yuki TiktokSearch!*
 ⤷ *Título:* ${data.title}`
      
      await sock.sendMessage(from, {video: {url: data.no_watermark}, caption: info}, {quoted: msg});
      
      await sock.sendMessage(from, {text: "Enviando áudio..."}, {quoted: msg});
      
      await sock.sendMessage(from, {audio: {url: data.music}, mimetype: "audio/mp3"});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
  }
}