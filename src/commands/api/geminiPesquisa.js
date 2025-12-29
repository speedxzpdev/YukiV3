const axios = require("axios");
require("dotenv").config();

module.exports = {
  name: "geminipesquisa",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const pergunta = args?.join(" ").trim();
      
      const perguntaUrl = encodeURIComponent(pergunta);
      
      if(!pergunta) {
        await sock.sendMessage(from, {text: 'Oque deseja pesquisar? Use: "/geminipesquisa c+++".'}, {quoted: msg});
        return
      }
      
      await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
      
      await sock.sendPresenceUpdate("composing", from);
      
      const url = await axios.get(`https://zero-two-apis.com.br/api/gemini/v2?query=${perguntaUrl}&apikey=${process.env.ZEROTWO_APIKEY}`);
      
      const data = url.data.resultado
      
      const info = `*Gemini Search!*
*Resposta:* ${data.Abstract}

*Fonte:* ${data.AbstractSource}

*Link:* ${data.AbstractURL}
`
      
      await sock.sendMessage(from, {text: info}, {quoted: msg});
      
      await sock.sendPresenceUpdate("paused", from);
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
  }
}