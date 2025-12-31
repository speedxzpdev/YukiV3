const { users } = require("../../database/models/users");
const path = require("path");

module.exports = {
  name: "perfil",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
      
      const sender = msg.key.participant ||  msg.key.remoteJid
      
      const Isuser = await users.findOne({userLid: sender});
      
      if(!Isuser) {
        await users.create({userLid: msg.key.participant || msg.key.remoteJid, name: msg.pushName || "Sem nome"});
      }
      
      const userSender = await users.findOne({userLid: sender});
      
      const infos = `*User:* @${userSender.userLid.split("@")[0]}
*Criado em:* ${userSender.registro.toLocaleDateString("pt-BR")}
*Bio:* ${userSender.bio}
*Namorado(a):* @${userSender?.casal?.parceiro?.split("@")[0] ?? "nenhum"}
*Dinheiro:* ${userSender.dinheiro}`

    
    const assetsPast = '../../assets/images'
      
      const icons = [`${assetsPast}/yuki.jpg`, `${assetsPast}/yuki2.jpg`, `${assetsPast}/yuki3.jpg`, `${assetsPast}/yuki4.jpg`, `${assetsPast}/yuki5.jpg`];
      
      const imgsRandom = icons[Math.floor(Math.random() * icons.length)];
    
    
      await sock.sendMessage(from, {image: {url: path.join(__dirname, imgsRandom)}, caption: infos, mentions: [sender]}, {quoted: msg});
      
      
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
  }
}