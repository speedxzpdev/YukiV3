const { clientRedis } = require("../../lib/redis.js");

module.exports = {
  name: "alugar",
  categoria: "padrao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    
    async function sendHelp() {
      await bot.reply(from, `*Como alugar a Yuki para o seu grupo:*

💰 Valor: *R$0,50 por dia*
📆 Mensal: *R$15,00*

*Exemplo de uso:*  
/alugar 15  
> Aluga a bot por 15 dias`);
    }
    
    try {
      //valor de alugel 
      const diaValor = 0.50;
      
      
      
      if(!from.endsWith("@g.us")) {
        await bot.reply(from, "Use esse comando em um grupo. Seu porra");
        return;
      }
      
      if(!await bot.isAdmin(from)) {
        await bot.sendNoAdmin(from);
        return;
      }
      
      const pagamentoPendente = await clientRedis.exists(`aluguel:${sender}&${from}`);
      
      if(pagamentoPendente === 1) {
        await bot.reply(from, "Hum... Verifiquei aqui e o grupo já possui um pagamento de aluguel pendente, espere alguns momentos até perdir outro.");
        return;
      }
      
      const dias = Number(args[0]);
      
      if(Number.isNaN(dias) || dias <= 0) {
        sendHelp();
        return;
      }
      
      if(dias > 80) {
        bot.reply(from, "Ei! Você não pode alugar mais de 80 dias, seu safado!");
        return;
      }
      
      const valor = diaValor * dias;
      
      await clientRedis.hSet(`aluguel:${sender}&${from}`, {
        grupo: from,
        valor: valor,
        participant: sender,
        dias: dias
      });
      
      await clientRedis.expire(`aluguel:${sender}&${from}`, 300);
      
      const valorFormatado = valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      const button = [
        {buttonId: "confirmar", buttonText: {displayText: "𝐂𝐨𝐧𝐟𝐢𝐫𝐦𝐚𝐫💖"}, type: 1},
        {buttonId: "cancelar", buttonText: {displayText: "𝐂𝐚𝐧𝐜𝐞𝐥𝐚𝐫🥀"}, type: 1}
        ];
      
      await sock.sendMessage(from, {text: `Hum... Verifiquei aqui e ${dias} dias custam ${valorFormatado}R$, digite *confirmar* para ir para o pagamento. Caso contrário digite cancelar`, buttons: button}, {quoted: msg});
      
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
}