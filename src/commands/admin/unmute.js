const { mutados } = require("../../database/models/mute");
const { donos } = require("../../database/models/donos");
const { numberBot } = require("../../config");


module.exports = {
  name: "unmute",
   async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
     
     async function reply(texto) {
      await sock.sendMessage(from, {text: texto}, {quoted: msg});
    }
    
    try {
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant
      
      const metadata = await sock.groupMetadata(from);
      
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
      
      const sender = msg.key.participant
      
      const donoSender = await donos.findOne({userLid: sender});
      
      
      if(!admins.includes(sender) && !donoSender) {
        await reply("Você n é admin, zé bct");
        return
      }
      
      if(!mention) {
        await reply("Mencione quem deseja desmutar.");
        return
      }
      
      const mutadoatual = await mutados.findOne({userLid: mention, grupo: from});
      
      if(!mutadoatual) {
        await reply("Esse usuário não está mutado.");
        return
      }
      
      await mutados.deleteOne({userLid: mention, grupo: from});
      
      await reply("Usuário desmutado com sucesso!");
    }
    catch(err) {
      await reply(erros_prontos);
      console.error(err)
    }
    
    
   }
}