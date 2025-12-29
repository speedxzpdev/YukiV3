require("dotenv").config();

module.exports = {
  name: "randomwaifu",
   categoria: "diversao",
   async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
     try {
       
       await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
       
       
       const waifuImage = `https://zero-two-apis.com.br/random/waifu2?apikey=${process.env.ZEROTWO_APIKEY}`;
       
       
       await sock.sendMessage(from, {image: {url: waifuImage}, caption: "💕Aqui está!"}, {quoted: msg});
     }
     catch(err) {
       const stringError = String(err);
       
       console.error(err)
       
       if(stringError.includes("500")) {
         await sock.sendMessage(from, {text: "Ouve um problema ao mandar requisição pra Api!"}, {quoted: msg});
         return
       }
       
       await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
       
     }
     
   }
}