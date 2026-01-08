const { users } = require("../../database/models/users");


module.exports = {
  name: "rankcmd",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const msgEspera = await sock.sendMessage(from, {text: "Buscando usuários ativos..."}, {quoted: msg});
      
      const globalUsers = await users.find().sort({cmdCount: -1}).limit(10);
      
      const rankMap = globalUsers.map((item, indice) => {
        return `${indice + 1}. @${item.userLid.split("@")[0]}\n⤷ *Comandos usados:* ${item.cmdCount}\n⤷ *Figurinhas feitas:* ${item.figurinhas}\n⤷ *Downloads:* ${item.donwloads}`
      });
      
      await sock.sendMessage(from, {text: `*Rank De Comandos Global:* \n\n${rankMap.join("\n\n")}`, edit: msgEspera.key, mentions: globalUsers.map(u => u.userLid)});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
  }
}