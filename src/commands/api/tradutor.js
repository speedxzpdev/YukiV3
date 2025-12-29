const axios = require("axios");




module.exports = {
  name: "tradutor",
   async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
     
     try {
       
       const palavra = args?.join(" ")?.trim();
       
       const palavraUrl = encodeURIComponent(palavra)
       
       if(!palavra) {
         await sock.sendMessage(from, {text: "Digite oque queira traduzir."}, {quoted: msg});
         return
       }
       
       await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
       
       const url = await axios.get(`https://zero-two-apis.com.br/api/info/translate?texto=${palavraUrl}&ling=pt&apikey=${process.env.ZEROTWO_APIKEY}`);
       
       
       const traducao = `⤷ "${url.data.result}"`
       
       
       await sock.sendMessage(from, {text: traducao}, {quoted: msg});
      
     }
     catch(err) {
       await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
       console.error(err)
     }
     
   }
}