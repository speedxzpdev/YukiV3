const tiktokDl = require("../utils/tiktok.js");

module.exports = {
  name: "tiktok",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    const texto = args.slice(0).join(" ").trim();
    
    if(!texto) {
      await sock.sendMessage(from, {text: 'Use "/tiktok <link"'}, {quoted: msg});
      return
    }
    
    tiktokDl(sock, msg, from, texto, erros_prontos, espera_pronta);
    
    
  }
}