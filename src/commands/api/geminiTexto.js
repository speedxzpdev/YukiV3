const axios = require("axios");

module.exports = {
  name: "gemini",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const pergunta = args?.join(" ").trim();
      
      const perguntaUrl = encodeURIComponent(pergunta);
      
      if(!pergunta) {
        await sock.sendMessage(from, {text: 'Pergunte oque deseja. Exemplo: "/gemini oi"'}, {quoted: msg});
        return
      }
      
      await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
      
      await sock.sendPresenceUpdate("composing", from);
      
      const url = await axios.get(`https://zero-two-apis.com.br/gemini/texto/imagem?query=${perguntaUrl}&apikey=${process.env.ZEROTWO_APIKEY}`);
      
      const data = url.data.resposta
      
      await sock.sendMessage(from, {text: data}, {quoted: msg});
      
      await sock.sendPresenceUpdate("paused", from);
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
  }
}