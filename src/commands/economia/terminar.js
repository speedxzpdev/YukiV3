const { users } = require("../../database/models/users");


module.exports = {
  name: "terminar",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const sender = msg.key.participant
      
      const userDiv = await users.findOne({userLid: sender});
      
      if(!userDiv.casal.parceiro) {
        await sock.sendMessage(from, {text: "Você nem tem namorado(a) bro💔💔"}, {quoted: msg});
        return
      }
      
      //deleta do user
      await users.updateOne({userLid: sender}, {$set: {"casal.parceiro": null, "casal.pedido": null}});
      //deleta da namorada
      await users.updateOne({userLid: userDiv.casal.parceiro}, {$set: {"casal.parceiro": null, "casal.pedido": null}});
      
      await sock.sendMessage(from, {text: `NÃO!! 😭😭 @${sender.split("@")[0]} terminou com @${userDiv?.casal?.parceiro.split("@")[0]}💔💔`, mentions: [sender, userDiv.casal.parceiro]}, {quoted: msg});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
  }
}