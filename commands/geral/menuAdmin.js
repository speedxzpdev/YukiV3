const menu = require("../../utils/menu");
const path = require("path");

module.exports = {
  name: "menuadm",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    try {
      
      await sock.sendMessage(from, {image: {url: path.join(__dirname, "../../assets/images/yuki.jpg")}, caption: menu(msg).menuAdmin}, {quoted: msg});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
    }
    
    
  }
}