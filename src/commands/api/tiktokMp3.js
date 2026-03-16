const tiktokDl = require("../../utils/tiktok.js");


module.exports = {
  name: "tiktokmp3",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      
      const texto = args.slice(0).join(" ").trim();
    
    if(!texto) {
      await sock.sendMessage(from, {text: 'Use "/tiktokmp3 <link"'}, {quoted: msg});
      return
    }
    
    const video = await tiktokDl(sock, msg, from, texto, erros_prontos, espera_pronta);
    
    await sock.sendMessage(from, {audio: {url: video.audio}, ptt: false, mimetype: "audio/mp4"}, {quoted: msg});
      
    }
    catch(err) {
      bot.reply(from, erros_prontos);
      console.error(err);
    }
  }
}
