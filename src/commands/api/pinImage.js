const axios = require("axios");


module.exports = {
  name: "pin",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const texto = args?.join(" ").trim();
      
      const pesquisa = encodeURIComponent(texto);
      
      if(!texto) {
        await sock.sendMessage(from, {text: "Digita alguma coisa. Filho da puta"}, {quoted: msg});
        return
      }
      
      await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
      
      const url = await axios.get(`https://zero-two-apis.com.br/api/pinterest2?text=${pesquisa}&apikey=yukiBot`);
      
      const data = url.data.resultado
      
      const result = data[Math.floor(Math.random() * data.length)];
      
      const info = `*Yuki Pinterest!*
*Upload*: ${result.upload_by}
*Seguidores*: ${result.followers}
*Titulo*: ${result.caption}
*Imagem*: ${result.source}`
      
      await sock.sendMessage(from, {image: {url: result.image}, caption: info}, {quoted: msg});
    }

    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
  }
}