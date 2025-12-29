const { donos } = require("../../database/models/donos");

module.exports = {
  name: "roletarussa",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      const metadata = await sock.groupMetadata(from);
      
      const isAdmin = metadata.participants.filter(p => p.admin).map(p => p.id);
    
      const sender = msg.key.participant
      
      const donosSender = await donos.findOne({userLid: sender})
      
      if(from.endsWith("@lid")) {
        await sock.sendMessage(from, {text: "Usa essa porra em grupo"}, {quoted: msg});
        return
      }
      
      if(!isAdmin.includes(sender) && !donosSender) {
        await sock.sendMessage(from, {text: "Tu é admin? Seu merda."}, {quoted: msg});
        return
      }
      
      const donosTotais = await donos.find();
      
      const donosLid = donosTotais.map(d => d.userLid);
      
      const members = metadata.participants.filter(p => {
        
        const admins = p.admin
        
        const isDono = donosLid.includes(p.id);
        
        return !admins && !isDono
      }).map(p => p.id);
      
      
      const memberRandom = members[Math.floor(Math.random() * members.length)];
      
      await sock.sendMessage(from, {text: `@${memberRandom.split("@")[0]}... Você foi o sorteado...`, mentions: [memberRandom]}, {quoted: msg});
      
      setTimeout(async () => {
        await sock.groupParticipantsUpdate(from, [memberRandom], "remove");
      }, 3000);
    }
    catch(err) {
      
      const errString = String(err);
      
      console.error(err);
      
      if(errString.includes("forbidden")) {
        await sock.sendMessage(from, {text: "Cadê meu adm? Seu lixo"}, {quoted: msg});
        return
      }
      
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
    }
  }
}