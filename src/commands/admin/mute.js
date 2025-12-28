const { mutados } = require("../../database/models/mute");
const { donos } = require("../../database/models/donos");
const { numberBot } = require("../../config");

module.exports = {
  name: "mute",
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
        await reply("Mencione quem deseja mutar.");
        return
      }
      
      const isdono = await donos.findOne({userLid: mention});
      
      if(isdono) {
        await reply("Muta subdono n seu miseravel");
        return
      }
      
      if(mention.includes(numberBot)) {
        await reply("Vai me mutar não seu lixo!");
        return
      }
      
      /*if(mention.includes(admins)) {
        await reply("Posso mutar adm não seu lixo.");
        return
      }
      */
      
      const ismute = await mutados.findOne({userLid: mention});
      
      if(ismute) {
        await reply("Este usuário já está mutado.");
        return
      }
      
      await mutados.create({userLid: mention, grupo: from});
      
      await reply("Usuário mutado com sucesso! Caso mande mais de 3 mensagens será removido.");
      
    }
    catch(err) {
      await reply(erros_prontos);
      return
    }
    
    
    
    
  }
}