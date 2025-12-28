const menu = require("../../utils/menu");
const path = require("path");

module.exports = {
  name: "menubrincadeira",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    try {
      
      
      const assetsPast = '../../assets/images'
      
      const icons = [`${assetsPast}/yuki.jpg`, `${assetsPast}/yuki2.jpg`, `${assetsPast}/yuki3.jpg`, `${assetsPast}/yuki4.jpg`, `${assetsPast}/yuki5.jpg`];
      
      const imgsRandom = icons[Math.floor(Math.random() * icons.length)];
      
      await sock.sendMessage(from, {image: {url: path.join(__dirname, imgsRandom)}, caption: menu(msg).menuBrincadeira}, {quoted: msg});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
    }
    
    
  }
}