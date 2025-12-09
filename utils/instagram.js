const axios = require("axios");


async function instaDl(sock, msg, from, body, erros_prontos, espera_pronta) {
  
  try {
    
    await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg})
    
    const req = await axios.get(`https://zero-two-apis.com.br/api/dl/instagram?url=${body}&apikey=yukiBot`)
    
    const data = req.data.resultados
    
    console.log(req.data)
    
    const videoList = data.video
    
    const foto = data.images
    
    if(videoList.length > 0) {
      
      for(let video of videoList) {
        
        await sock.sendMessage(from, {video: {url: video}}, {quoted: msg});
      }
    }
    
    if(foto.length > 0) {
      
      for(let image of foto) {
        
        await sock.sendMessage(from, {image: {url: image}}, {quoted: msg});
      }
    }
    
    
  }
  catch(err) {
    await sock.sendMessage(from, {text: erros_prontos}, {quotes: msg});
    //console.error(err)
  }
  
  
  
  
}

module.exports = instaDl
