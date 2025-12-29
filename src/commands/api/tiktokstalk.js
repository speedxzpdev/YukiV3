const axios = require("axios");
require("dotenv").config();

module.exports = {
  name: "tiktokstalk",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    try {
    
    const texto = args.slice(0).join(" ")?.trim();
    
    const pesq = encodeURIComponent(texto);
    
    if(!texto) {
      
      await sock.sendMessage(from, {text: 'Use "/tiktokstalk <user>"'}, {quoted: msg})
      return
    }
    
    
    const req = await axios.get(`https://zero-two-apis.com.br/api/tiktokstalker/v3?usuario=${texto}&apikey=${process.env.ZEROTWO_APIKEY}`);
    
    const data = req.data.resultado
    
    const info = `*Yuki TiktokStalk!*
> Perfil
→ *User:* ${data.usuario}
→ *Apelido:* ${data.apelido}
→ *País:* ${data.pais}
→ *Seguidores:* ${data.seguidores_totais}
→ *Seguindo:* ${data.seguindo}
→ *Curtidas:* ${data.curtidas_totais ?? "Indisponível"}
→ *Vídeos totais:* ${data.videos_totais  ?? "Indisponível"}
> Estartisticas
→ *Engajamento:* ${data.engajamento_geral  ?? "Indisponível"}
→ *Taxa de curtidas:* ${data.taxa_curtidas  ?? "Indisponível"}
→ *Taxa de comentarios:* ${data.taxa_comentarios  ?? "Indisponível"}
→ *Taxa de compartilhamento:* ${data.taxa_compartilhamento  ?? "Indisponível"}
> Médias
→ *Média de curtidas:* ${data.media_curtidas  ?? "Indisponível"}
→ *Média de views:* ${data.media_visualizacoes  ?? "Indisponível"}
→ *Média de compartilhamentos:* ${data.media_compartilhamentos  ?? "Indisponível"}
`
    
    
    await sock.sendMessage(from, {image: {url: data.foto_perfil}, caption: info ?? "Usuário inválido!"}, {quoted: msg});
    
    
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
    
  }
  
}