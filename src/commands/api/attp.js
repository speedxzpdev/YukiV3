require("dotenv").config();

module.exports = {
  name: "attp",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
     try {
       
       const frase = args?.join(" ").trim();
       
       const fraseEncode = encodeURIComponent(frase);
       
       if(!frase) {
         await sock.sendMessage(from, {text: "Paramêtro errado! Use: /attp ispeeed"});
         return
       }
       
       await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
       
       
       const attp = `https://zero-two-apis.com.br/makerfig/rgb?fig=attp&texto=${fraseEncode}&apikey=${process.env.ZEROTWO_APIKEY}`;
       
       await sock.sendMessage(from, {sticker: {url: attp}}, {quoted: msg});
       
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