const axios = require("axios");

module.exports = {
  name: "instastalk",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const user = args?.join(" ").trim();
      
      if(!user) {
        await sock.sendMessage(from, {text: `Cadê o @?! Use: "/instastalk usuario".`}, {quoted: msg});
        return
      }
        await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
        
        
        const response = await axios.get(`https://zero-two-apis.com.br/api/instagram/user?username=${encodeURIComponent(user)}&apikey=${process.env.ZEROTWO_APIKEY}`)
        
        
        const data = response.data.resultado
        
        const info = `*Yuki Stalk!*
*Username:* ${data.username}
*Apelido:* ${data.fullname}
*Id:* ${data.id}
*Biografia:* ${data.biography}
*Seguidores:* ${data.followers}
*Seguindo:* ${data.following}
*Posts:* ${data.post_count}
*É verificado?* ${data.is_verified ? "Sim" : "Não"}
É privada?* ${data.is_private ? "Sim": "Não"}
`
        await sock.sendMessage(from, {image: {url: data.hd_profile_pic_url_info.url}, caption: info}, {quoted: msg});
      }
      catch(err) {
        const error = String(err);
        console.error(err);
        
        if(error.includes("404")) {
          await sock.sendMessage(from, {text: `Usuário não encontrado!`}, {quoted: msg});
          return
        }
        
        if(error.includes("500")) {
          await sock.sendMessage(from, {text: "A api explodiu!"}, {quoted: msg});
          return
        }
        
        await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      }
      
      
    }
    
  }
