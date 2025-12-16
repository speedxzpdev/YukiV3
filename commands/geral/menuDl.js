const menu = require("../../utils/menu");
const path = require("path")


module.exports = {
  name: "menudownloads",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    const sender = msg.key.participant
    const agora = new Date();
    
    
    
    
    
    
    
    try {
      
      await sock.sendMessage(from, {image: {url: path.join(__dirname, "../../assets/images/yuki.jpg")}, caption: menu(msg).menuDownloads}, {quoted: msg});
      
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.log(err)
    }
    
    
    
    
    
  }
}