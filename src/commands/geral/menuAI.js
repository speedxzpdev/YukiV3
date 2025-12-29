const menu = require("../../utils/menu");
const path = require("path")


module.exports = {
  name: "menuia",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    const sender = msg.key.participant
    const agora = new Date();
    
    
    try {
      
      const assetsPast = '../../assets/images/yukiBanner.jpg'
      
      await sock.sendMessage(from, {image: {url: path.join(__dirname, assetsPast)}, caption: menu(msg).menuAI}, {quoted: msg});
      
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.log(err)
    }
    
    
    
    
    
  }
}