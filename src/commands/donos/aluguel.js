const { grupos } = require("../../database/models/grupos");
const { donos } = require("../../database/models/donos");


module.exports = {
  name: "alugar",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const sender = msg.key.participant
      
      const donoSender = await donos.findOne({userLid: sender});
      
      if(!donoSender) {
        await sock.sendMessage(from, {text: "Só donos podem usar essa merda!"}, {quoted: msg});
        return
      }
      
      if(!from.endsWith("@g.us")) {
        await sock.sendMessage(from, {text: "Use em um grupo."}, {quoted: msg});
        return
      }
      
      const parametro = args?.slice(0).join(" ").trim();
      
      const diasAluguel = Number(parametro);
      
      if(!diasAluguel || diasAluguel <=0) {
        await sock.sendMessage(from, {text: "Digite dias válidos!"}, {quoted: msg});
        return
      }
      
      const msgEspera = await sock.sendMessage(from, {text: `Adicionando ${diasAluguel} dias, ao grupo...`}, {quoted: msg});
      
      
      
      
      const diaMs = 24 * 60 * 60 * 1000
      
      const diasVencimento = diasAluguel * diaMs
      
      await grupos.updateOne({groupId: from}, {$set: {aluguel: diasVencimento + Date.now()}});
      
      await sock.sendMessage(from, {text: 'Dias adicionados com sucesso! Use: "/grupoinfo", para ver mais informações.', edit: msgEspera.key});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
  }
}