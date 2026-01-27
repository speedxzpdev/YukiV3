const { users } = require("../../database/models/users");

module.exports = {
  name: "diario",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot) {
    try {
      
      const sender = msg.key.participant
      
      const userSender = await users.findOne({userLid: sender});
      
      const agr = new Date().toLocaleDateString("pt-BR");
      
      const ultimoDaily = userSender?.daily ?   new Date(userSender.daily).toLocaleDateString("pt-BR") : null;
      
      if(ultimoDaily && agr === ultimoDaily) {
        await bot.reply(from, "Ei seu espertinho! Você já resgatou seu diário de hoje, volte amanhã");
        return
      }
      
      await bot.reply(from, espera_pronta);
      
      const dinheiro = Math.floor(Math.random() * 1000);
      
      
      await users.updateOne({userLid: sender}, {$set: {daily: new Date()}, $inc: {dinheiro: dinheiro}});
      
      await bot.reply(from, `${msg.pushName || "Sem nome"}, parabéns você ganhou ${dinheiro} moedas`);
      
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
}