const { numberBot } = require("../../config");



module.exports = {
  name: "molestar",
  categoria: "diversao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    try {
      
      const sender = msg.key.participant
      
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  || msg.message?.extendedTextMessage?.contextInfo?.participant
      
      
      if(!mention) {
        await sock.sendMessage(from, {text: "Menciona alguém, seu jumento tarado(a)."}, {quoted: msg});
        return
      }
      
      if(mention.includes(numberBot)) {
        await sock.sendMessage(from, {text: "?... Acha que consegue me molestar?!"}, {quoted: msg});
        return
      }
      
      const gifs = ["https://files.catbox.moe/d772lq.mp4", "https://files.catbox.moe/kos8j9.mp4", "https://files.catbox.moe/3yty81.mp4", "https://files.catbox.moe/j6v543.mp4"];
      
      const gifsRandom = gifs[Math.floor(Math.random() * gifs.length)];
      
      const alvo = "@"+mention.split("@")[0];
      const autor = "@"+sender.split("@")[0];
      
      const rpgList = [`-N NÃO... ${autor} molestou o ${alvo} e ele acabou gostando...`, `O ${autor} foi molestar o ${alvo} e acabou broxando...`, `Eu já não entendo mais nada... ${autor} foi tentar molestar o ${alvo} e acabou sendo molestado...`, `O ${autor} foi todo empolgado... E acabou escorregando na pika do ${alvo} e dizem que ele gostou...`];
      
      const RpgRandom = rpgList[Math.floor(Math.random() * rpgList.length)];
      
      await sock.sendMessage(from, {video: {url: gifsRandom}, gifPlayback: true, caption: RpgRandom, mentions: [sender, mention]}, {quoted: msg});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
    
  }
  
  
}