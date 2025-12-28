const shinigamiJson = require("../../database/random/shinigamis.json");


module.exports = {
  
  name: "shinigami",
  categoria: "diversao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    try {
      
      const shinigamisRandom = shinigamiJson[Math.floor(Math.random() * shinigamiJson.length)]
      
      console.log(shinigamisRandom)
      
      await sock.sendMessage(from, {image: {url: shinigamisRandom.img}, caption: `Seu shinigami é... ${shinigamisRandom.name}`}, {quoted: msg});
      
      
    }
    catch(err) {
      console.error(err)
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
    }
    
    
    
    
  }
  
}