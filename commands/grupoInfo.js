const { grupos } = require("../database/models/grupos");



module.exports = {
  name: "grupo",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    try {
      
      if (msg.key.remoteJid.endsWith("@lid")) {
        await sock.sendMessage(from, {text: "Use esse comando dentro de um grupo."}, {quoted: msg});
        return
      }
      
      const grupoDb = await grupos.findOne({groupId: from});
      
      
      
      if (!grupoDb) {
        await grupos.create({groupId: from});
      }
      
      await sock.sendMessage(from, {text: "Buscando por infomações do grupo..."}, {quoted: msg});
      
      const metadata = await sock.groupMetadata(from);
      
      const vencimentoDate = new Date(grupoDb.aluguel);
      
      const info = `𝙄𝙣𝙛𝙤𝙧𝙢𝙖çõ𝙚𝙨 𝙙𝙤 𝙜𝙧𝙪𝙥𝙤
Nome: ${metadata.subject}
Id: ${from.split("@")[0]}
Pago: ${vencimentoDate.toLocaleDateString("pt-BR") || "Não definido"}
𝘾𝙤𝙣𝙛𝙞𝙜𝙪𝙧𝙖çõ𝙚𝙨 𝙚 𝙚𝙫𝙚𝙣𝙩𝙤𝙨
eventos: ${grupoDb.configs?.events ? "On" : "Off"}
bem-vindo: ${grupoDb.configs?.welcome ? "On" : "Off"}
anti-link: ${grupoDb.configs?.antlink ? "On" : "Off"}
auto-resposta: ${grupoDb?.autoReply ? "On" : "Off"}`
      
      
      await sock.sendMessage(from, {image: {url: "https://files.catbox.moe/zj7yc6.jpg"}, caption: info}, {quoted: msg});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
  }
}