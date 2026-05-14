const { handleDownloadChoice, isTikTokUrl } = require("../../utils/tiktok.js");


module.exports = {
  name: "tiktokmp3",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      
      const texto = args.slice(0).join(" ").trim();
    
    if(!texto || !isTikTokUrl(texto)) {
      await sock.sendMessage(from, {text: 'Use "/tiktokmp3 <link do TikTok>"'}, {quoted: msg});
      return
    }
    
    await sock.sendMessage(from, {text: espera_pronta || "Baixando áudio do TikTok..."}, {quoted: msg});
    await handleDownloadChoice(sock, msg, from, texto, "audio", sender);
      
    }
    catch(err) {
      bot.reply(from, erros_prontos);
      console.error(err);
    }
  }
}
