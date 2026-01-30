const axios = require("axios");


module.exports = {
  name: "metadinha",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
      
      const response = await axios.get(`https://zero-two-apis.com.br/random/metadinha?apikey=${process.env.ZEROTWO_APIKEY}`);
      
      const data = response.data 
      
      await sock.sendMessage(from, {image: {url: data.masculina}}, {quoted: msg});
      
      await sock.sendMessage(from, {image: {url: data.feminina}}, {quoted: msg});
      
    }
    catch(err) {
      const erro = String(err);
      
      console.error(err);
      
      if(erro.includes("500")) {
        await sock.sendMessage(from, {text: "A api caiu. Espere alguns momentos"}, {quoted: msg});
        return
      }
      
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      
      
    }
    
  }
}