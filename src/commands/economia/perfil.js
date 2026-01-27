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
      
      const waifuRepetidas = new Set();
      
      const waifusInv = userSender.waifus.sort((a, b) => {
        return b.preco - a.preco
      }).filter(f => {
        if (waifuRepetidas.has(f.nome)) return false;
        
        waifuRepetidas.add(f.nome);
        return true;
      }).map((item, indice) => {
        return `${indice + 1}° ${item.nome}
⤷ *Raridade:* ${item.raridade}
⤷ *Preço:* ${item.preco} moedas`
      });
      
      let senderProfile;
      
      try {
        senderProfile = await sock.profilePictureUrl(sender, "image");
      } catch(e) {
        senderProfile = null;
      }
      
      const vencimentoMs = userSender?.vencimentoVip - Date.now();
      
      const vencimentoDias = Math.max(0, Math.ceil(vencimentoMs / (24 * 60 * 60 * 1000)))
      
      const infos = `*User:* @${userSender.userLid.split("@")[0]}
*Criado em:* ${userSender.registro.toLocaleDateString("pt-BR")}
*Bio:* ${userSender.bio}
*Vip:* ${vencimentoDias || 0} dias - ${userSender?.vencimentoVip ? "Vence em " + userSender.vencimentoVip.toLocaleDateString("pt-BR") : "Vencido!"}
*Modo sem prefixo:* ${userSender?.prefixo ? "Desativado" : "Ativado"}
*Namorado(a):* ${ userSender?.casal?.parceiro ? `@${userSender?.casal?.parceiro?.split("@")[0]}
*Desde:* ${userSender?.casal?.pedido.toLocaleDateString("pt-BR")}💕` : "nenhum"}
*Dinheiro:* ${userSender.dinheiro}
*Quantidade waifus:* ${userSender.waifus.length}
*Comandos usados:* ${userSender.cmdCount}
*Downloads:* ${userSender.donwloads}
*Figurinhas:* ${userSender.figurinhas}

*Inventário de waifus:*
${waifusInv.join("\n\n")}
`

    
    const assetsPast = '../../assets/images'
      
      const icons = [`${assetsPast}/yuki.jpg`, `${assetsPast}/yuki2.jpg`, `${assetsPast}/yuki3.jpg`, `${assetsPast}/yuki4.jpg`, `${assetsPast}/yuki5.jpg`];
      
      const imgsRandom = icons[Math.floor(Math.random() * icons.length)];
    
    
      await sock.sendMessage(from, {image: {url: senderProfile ? senderProfile : path.join(__dirname ,imgsRandom)}, caption: infos, mentions: [sender, ...(userSender?.casal?.parceiro ? [userSender.casal.parceiro] : [])]}, {quoted: msg});
      
      
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
  }
}