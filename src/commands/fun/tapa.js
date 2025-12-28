const { numberBot } = require("../../config");



module.exports = {
  name: "tapa",
  categoria: "diversao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    try {
      
      const sender = msg.key.participant
      
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  || msg.message?.extendedTextMessage?.contextInfo?.participant
      
      
      if(!mention) {
        await sock.sendMessage(from, {text: "Menciona alguém, seu merda"}, {quoted: msg});
        return
      }
      
      if(mention.includes(numberBot)) {
        await sock.sendMessage(from, {text: "Oh, maldade..."}, {quoted: msg});
        return
      }
      
      const gifs = ["https://files.catbox.moe/5i6q2l.mp4", "https://files.catbox.moe/v4gs3m.mp4", "https://files.catbox.moe/d0hmjy.mp4"];
      
      const gifsRandom = gifs[Math.floor(Math.random() * gifs.length)];
      
      const alvo = "@"+mention.split("@")[0];
      const autor = "@"+sender.split("@")[0];
      
      const rpgList = [`O ${autor} deu moh tapa no ${alvo} e ele acabou gostando...`, `${autor} deu um tapa no ${alvo} que fez ele pular de alegria!`, `${autor} deu um tapa tão forte em ${alvo} que ele acabou desmaiando de tesão`];
      
      const RpgRandom = rpgList[Math.floor(Math.random() * rpgList.length)];
      
      await sock.sendMessage(from, {video: {url: gifsRandom}, gifPlayback: true, caption: RpgRandom, mentions: [sender, mention]}, {quoted: msg});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
    
  }
  
  
}