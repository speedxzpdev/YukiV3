const { advertidos } = require("../../database/models/adverts");

const { donos } = require("../../database/models/donos");

module.exports = {
  name: "adv",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const metadata = await sock.groupMetadata(from);
      
      const isAdmin = metadata.participants.filter(p => p.admin).map(p => p.id);
      
      const sender = msg.key.participant
      
      if(!isAdmin.includes(sender)) {
        await sock.sendMessage(from, {text: "TU É ADMIN?! FILHO DA PUTA!"}, {quoted: msg});
        return
      }
      
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant
      
      if(!mention) {
        await sock.sendMessage(from, {text: "Pelo amor de Deus... Marca alguém seu lixo!"}, {quoted: msg});
        return
      }
      
      const doninhos = await donos.findOne({userLid: mention});
      
      if(doninhos) {
        await sock.sendMessage(from, {text: "Tentar advertir um dono é igual um velho tentando fuder. Nunca funciona"}, {quoted: msg});
        return
      }
      
      
      
      const advUpdate = await advertidos.findOneAndUpdate({userLid: mention, grupo: from}, {$inc: {adv: 1}}, {new: true, upsert: true});
      
      await sock.sendMessage(from, {text: "Advertência adicionada com sucesso!"}, {quoted: msg});
      
      await sock.sendMessage(from, {text: `@${advUpdate.userLid.split("@")[0]}, você foi advertido. Agora possui ${advUpdate.adv}, se chegar a 3 será expulso.`, mentions: [advUpdate.userLid]}, {quoted: msg});
      
      if(advUpdate.adv >= 3) {
        await sock.sendMessage(from, {text: "Membro expulso por ter 3 ou mais advertências!"}, {quoted: msg});
        
        await sock.groupParticipantsUpdate(from, [mention], "remove");
        
        await advertidos.deleteOne({userLid: mention, grupo: from});
        
      }
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
  }
}