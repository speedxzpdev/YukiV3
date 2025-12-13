const { donos } = require("../../database/models/donos");

module.exports = {
  name: "grupo",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    async function sendHelp() {
      await sock.sendMessage(from, {text: `*Como mudar estados de um grupo com a Yuki:*
> Ao usar /grupo deve-se usar um parâmetro de algum estado que deseja pôr no grupo.
*Tipos de estado:*
*"/grupo a"*
> Deixa o grupo aberto para mensagens.
*"/grupo f"*
> Deixa o grupo fechado para membros.

Fácil de usar, né? Não? Então você possui algum tipo de deficiência mental.`}, {quoted: msg});
    }
    try {
      
      const metadata = await sock.groupMetadata(from);
      
      const admin = metadata.participants.filter(p => p.admin).map(p => p.id);
      
      const sender = msg.key.participant
      
      const donoSender = await donos.findOne({userLid: sender});
      
      if(!admin.includes(sender) && !donoSender) {
        await sock.sendMessage(from, {text: "Tu é admin? Seu merda."}, {quoted: msg});
        return
      }
      
      const parametro = args?.[0]?.trim();
      
      if(!parametro) {
        await sendHelp();
        return
      }
      
      if(parametro === "f") {
        await sock.groupSettingUpdate(from, 'announcement');
        return
       }
      
      if(parametro === "a") {
        await sock.groupSettingUpdate(from, "not_announcement");
        return
      }
      
      else {
        await sendHelp();
        return
      }
      
    }
    catch(err) {
      const debug = String(err);
      
      if(debug.includes("forbidden")) {
        await sock.sendMessage(from, {text: "Não possuo admin."}, {quoted: msg});
      }
      
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      
      console.error(err)
      
    }
    
    
  }
  
}