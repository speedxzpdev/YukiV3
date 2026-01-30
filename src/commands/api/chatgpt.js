const axios = require("axios");



module.exports = {
  name: "chatgpt",
  
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    try {
    
    const pergunta = encodeURIComponent(args.slice(0).join(" "))
    
    if (!pergunta) {
      await sock.sendMessage(from, {text: 'Pergunta algo seu bocó, *exemplo:* "/chatgpt oi"'}, {quoted: msg});
      return
    }
      
      const req = await axios.get(`https://zero-two-apis.com.br/api/ia/gpt?query=${pergunta}&apikey=${process.env.ZEROTWO_APIKEY}`);

    
    const data = req.data
    
      
      await sock.sendMessage(from, {text: data.resultado}, {quoted: msg});
      
      
      
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
      
      
      
      
      
      
    }
    
    
    
  }
