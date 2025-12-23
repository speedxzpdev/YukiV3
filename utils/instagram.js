const axios = require("axios");


async function instaDl(sock, msg, from, body, erros_prontos, espera_pronta) {
  
  try {
    
    if(!body) {
      await sock.sendMessage(from, {text: "Cadê o link? Porra"}, {quoted: msg})
      return
    }
    
    await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg})
    
    const req = await axios.get(`https://zero-two-apis.com.br/api/instagram?url=${body}&apikey=yukiBot`)
    
    const data = req.data
    
    await sock.sendMessage(from, {video: {url: data.resultados[0].url}, caption: "Video baixado com sucesso!"}, {quoted: msg});
    
    
    
  }
  catch(err) {
    await sock.sendMessage(from, {text: erros_prontos}, {quotes: msg});
    console.error(err)
  }
  
  
  
  
}

module.exports = instaDl
