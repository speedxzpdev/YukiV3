const { numberBot } = require("../../config");



module.exports = {
  name: "beijar",
  categoria: "diversao"
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    try {
      
      const sender = msg.key.participant
      
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  || msg.message?.extendedTextMessage?.contextInfo?.participant
      
      
      if(!mention) {
        await sock.sendMessage(from, {text: "Menciona alguém, seu jumento romântico."}, {quoted: msg});
        return
      }
      
      if(mention.includes(numberBot)) {
        await sock.sendMessage(from, {text: "KKKKKK, eca que nojo!"}, {quoted: msg});
        return
      }
      
      const gifs = ["https://files.catbox.moe/atqyhn.mp4", "https://files.catbox.moe/2xlkyh.mp4", "https://files.catbox.moe/37lj7l.mp4", "https://files.catbox.moe/shw2ex.mp4"];
      
      const gifsRandom = gifs[Math.floor(Math.random() * gifs.length)];
      
      const rpgList = [`@${sender.split("@")[0]} beijou @${mention.split("@")[0]} sem avisar nada... Criminoso porém estiloso`, `@${sender.split("@")[0]} deu um beijo em @${mention.split("@")[0]} qe travou o universo...`, `@${sender.split("@")[0]} tentou beijar @${mention.split("@")[0]} e levou um tapa que doeu até o vento...`, `@${sender.split("@")[0]} tentou beijar @${mention.split("@")[0]} e caiu de cara no chãoKKKKKKKK`, `@${sender.split("@")[0]} é... @${mention.split("@")[0]} saiu correndo, acho que foi um amor não correspondido`];
      
      const RpgRandom = rpgList[Math.floor(Math.random() * rpgList.length)];
      
      await sock.sendMessage(from, {video: {url: gifsRandom}, gifPlayback: true, caption: RpgRandom, mentions: [sender, mention]}, {quoted: msg});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
    
  }
  
  
}