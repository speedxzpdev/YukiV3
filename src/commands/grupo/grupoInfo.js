const { grupos } = require("../../database/models/grupos");
const path = require("path");


module.exports = {
  name: "grupoinfo",
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
      
      const vencimentoMs = grupoDb?.aluguel?.getTime();
      const agora = Date.now();
      
      const restanteMs = vencimentoMs - agora
      
      const restanteDias = Math.max(0, Math.ceil(restanteMs / (24 * 60 * 60 * 1000)));
      
      const info = `𝗜𝗻𝗳𝗼𝗿𝗺𝗮𝗰̧𝗼̃𝗲𝘀 𝗱𝗼 𝗴𝗿𝘂𝗽𝗼
*Nome:* ${metadata.subject}
*Id:* ${from.split("@")[0]}
*Vence em:* ${grupoDb?.aluguel ? grupoDb.aluguel.toLocaleDateString("pt-BR") : "Vencido!"} - Faltam ${restanteDias || 0} dias
*Comandos usados:* ${grupoDb.cmdUsados}
𝗖𝗼𝗻𝗳𝗶𝗴𝘂𝗿𝗮𝗰̧𝗼̃𝗲𝘀
*eventos:* ${grupoDb.configs?.events ? "On" : "Off"}
*bem-vindo:* ${grupoDb.configs?.welcome ? "On" : "Off"}
*anti-link:* ${grupoDb.configs?.antlink ? "On" : "Off"}
*auto-resposta:* ${grupoDb?.autoReply ? "On" : "Off"}
*Modo brincadeira:* ${grupoDb?.configs?.cmdFun ? "On" : "Off"}
*Auto-Download:* ${grupoDb?.autoDownload ? "On" : "Off"}
*Anti-spam de marcação:* ${grupoDb?.antiTotag ? "On" : "Off"}`
      
      
      await sock.sendMessage(from, {image: {url: path.join(__dirname, "../../assets/images/yuki2.jpg")}, caption: info}, {quoted: msg});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
  }
}