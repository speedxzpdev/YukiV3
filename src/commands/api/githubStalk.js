const axios = require("axios");


module.exports = {
  name: "githubstalk",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    try {
      
      const user = args[0]?.trim();
      
      if(!user) {
        await bot.reply(from, "Preciso do username! Digite: /githubstalk speedxzpdev");
        return
      }
      
      await bot.reply(from, espera_pronta);
      
      const response = await axios.get(`https://api.github.com/users/${encodeURIComponent(user)}`);
      
      const data = response.data
      
      const info = `*Yuki Github/Stalk!*
 ⤷ *Usuário:* ${data?.login || "Sem nome"}
 ⤷ *Url:* ${data?.url || "Sem url"}
 ⤷ *Criado em:* ${data?.create_a?.toLocaleDateString("pt-BR") || "Indefinido"}
 ⤷ *Seguidores:* ${data?.followers || 0}
 ⤷ *Seguindo:* ${data?.following || 0}
 ⤷ *Bio:* ${data?.bio || "Sem bio"}
 ⤷ *Repositórios públicos:* ${data?.public_repos || 0}
 ⤷ *Localização:* ${data?.location || "Indefinido"}`
 
      
      await sock.sendMessage(from, {image: {url: data.avatar_url}, caption: info}, {quoted: msg});
      
    }
    catch(err) {
      const status = err.status
      
      if(status === 404) {
        await bot.reply(from, "Usuário não encontrado!! 404");
        console.error(err);
        return
      }
      
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
}