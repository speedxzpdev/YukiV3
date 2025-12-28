const { numberBot } = require("../../config");



module.exports = {
  name: "comer",
  categoria: "diversao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    try {
      
      const sender = msg.key.participant
      
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  || msg.message?.extendedTextMessage?.contextInfo?.participant
      
      
      if(!mention) {
        await sock.sendMessage(from, {text: "Menciona alguém, seu jumento safado(a)."}, {quoted: msg});
        return
      }
      
      if(mention.includes(numberBot)) {
        await sock.sendMessage(from, {text: "...? A Yuki é pura, não faz esse tipo de coisa."}, {quoted: msg});
        return
      }
      
      const gifs = ["https://files.catbox.moe/urvd34.mp4", "https://files.catbox.moe/zjllqp.mp4", "https://files.catbox.moe/k7hfz3.mp4"];
      
      const gifsRandom = gifs[Math.floor(Math.random() * gifs.length)];
      
      const alvo = "@"+mention.split("@")[0];
      const autor = "@"+sender.split("@")[0];
      
      const rpgList = [`${autor} Foi todo animadinho pra cima de ${alvo} e algo acabou não subindo...`, `${autor} comeu ${alvo} mais algum dos dois acabaram não aguentando nem 5 minutos, quem será...`, `${autor} acabou com ${alvo} na cama!`, `${autor} despertou seu lado gay e foi comido por ${alvo}`, `${autor} tava todo empolgadinho até o ${alvo} expulsar ele de casa`, `${autor} teve uma noite bem amorosa com ${alvo}...`];
      
      const RpgRandom = rpgList[Math.floor(Math.random() * rpgList.length)];
      
      await sock.sendMessage(from, {video: {url: gifsRandom}, gifPlayback: true, caption: RpgRandom, mentions: [sender, mention]}, {quoted: msg});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
    
  }
  
  
}