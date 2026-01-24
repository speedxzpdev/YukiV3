const menu = require("../../utils/menu");
const path = require("path")


module.exports = {
  name: "menu",
  categoria: "padrao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    const sender = msg.key.participant
    const agora = new Date();
    
    try {
      
      const assetsList = ['../../assets/images/yukiBanner.jpg', '../../assets/images/yukiBanner2.jpg'];
      
      const assetsPast = assetsList[Math.floor(Math.random() * assetsList.length)];
      
      
      await sock.sendMessage(from, {image: {url: path.join(__dirname, assetsPast)}, caption: menu(msg).menuPrincipal, mentions: [sender]}, {quoted: msg});
      
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.log(err)
    }
    
    
    
    
    
  }
}