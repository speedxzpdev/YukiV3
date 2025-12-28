const { advertidos } = require("../../database/models/adverts");

const { donos } = require("../../database/models/donos");

module.exports = {
  name: "rmadv",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      const metadata = await sock.groupMetadata(from);
      
      const isAdmin = metadata.participants.filter(p => p.admin).map(p => p.id);
      
      const sender = msg.key.participant
      
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant
      
      const doninhos = await donos.findOne({userLid: sender});
      
      if(!isAdmin.includes(sender) && !doninhos) {
        await sock.sendMessage(from, {text: "TU É ADMIN?! FILHO DA PUTA!"}, {quoted: msg});
        return
      }
      
      if(!mention) {
        await sock.sendMessage(from, {text: "Pelo amor de Deus... Marca alguém seu lixo!"}, {quoted: msg});
        return
      }
      
      const userAdv = await advertidos.findOne({userLid: mention, grupo: from});
      
      if(!userAdv || userAdv.adv <=0) {
        await sock.sendMessage(from, {text: "Esse usuário não possui advertências."}, {quoted: msg});
        return
      }
      
      const advRemovido = await advertidos.findOneAndUpdate({userLid: mention, grupo: from}, {$inc: {adv: -1}}, {new: true});
      
      
      await sock.sendMessage(from, {text: `Advertência removida com sucesso! Agora @${advRemovido.userLid.split("@")[0]} possui ${advRemovido.adv} advertências.`, mentions: [mention]}, {quoted: msg});
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
  }
}