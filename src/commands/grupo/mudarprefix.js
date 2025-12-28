const { grupos } = require("../../database/models/grupos");
const { donos } = require("../../database/models/donos");



module.exports = {
  name: "alterarprefixo",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      const prefixEscolhido = args[0];
      const metadados = await sock.groupMetadata(from);
      const Admins = metadados.participants.filter(p => p.admin);
      const groupAdmins = Admins.map(m => m.id);
      const sender = msg.key.participant
      
      const doninhos = await donos.findOne({userLid: sender});
      
      if(!groupAdmins.includes(sender) && !doninhos) {
        await sock.sendMessage(from, {text: "Só quem pode mudar o prefixo é um admin!"}, {quoted: msg});
        return
      }
      
      
      
      if(!await grupos.findOne({groupId: from})) {
        await grupos.create({groupId: from})
      }
      
      if(prefixEscolhido.length >1) {
        await sock.sendMessage(from, {text: "Passou de 1 caractere porra."}, {quoted: msg});
        return
      }
      
      if(!prefixEscolhido) {
        await sock.sendMessage(from, {text: "Cadê o prefixo? Zé bct"}, {quoted: msg});
        return
      }
      
      await sock.sendMessage(from, {text: "Alterando prefixo..."}, {quoted: msg});
      
      await grupos.updateOne({groupId: from}, {$set: {"configs.prefixo": prefixEscolhido}});
      
      await sock.sendMessage(from, {text: `Prefixo alterado para: \`${prefixEscolhido}\``}, {quoted: msg});
  
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
    
  }
}