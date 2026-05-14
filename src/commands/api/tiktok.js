const { handleDownloadChoice, isTikTokUrl } = require("../../utils/tiktok.js");

module.exports = {
  name: "tiktok",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    
    const texto = args.slice(0).join(" ").trim();
    
    if(!texto || !isTikTokUrl(texto)) {
      await sock.sendMessage(from, {text: 'Use "/tiktok <link do TikTok>"'}, {quoted: msg});
      return
    }
    
    await sock.sendMessage(from, {text: espera_pronta || "Baixando TikTok..."}, {quoted: msg});
    await handleDownloadChoice(sock, msg, from, texto, "original", sender);
    
    
  }
}
