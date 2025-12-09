const menu = require("../utils/menu");



module.exports = {
  name: "menu",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    const sender = msg.key.participant
    const agora = new Date();
    
    
    
    
    
    
    
    try {
      
      await sock.sendMessage(from, {image: {url: "https://files.catbox.moe/i0u9h1.jpg"}, caption: menu(msg), mentions: [sender]}, {quoted: msg});
      
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos});
      console.log(err)
    }
    
    
    
    
    
  }
}