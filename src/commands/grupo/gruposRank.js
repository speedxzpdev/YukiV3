const { grupos } = require("../../database/models/grupos");


module.exports = {
  name: "gruposrank",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const msgEspera = await sock.sendMessage(from, {text: "Buscando rank dos grupos..."}, {quoted: msg});
      
      const group = await grupos.find().sort({cmdUsados: -1 }).limit(10);
      
      const rankMap = group.map((item, indice) => {
        return `\`${indice + 1}. ${item.grupoName}\`\n ⤷ Cmd usados: ${item.cmdUsados}`
      });
      
      await sock.sendMessage(from, {text: `*Grupos com mais usos da bot*\n\n${rankMap.join("\n\n")}`, edit: msgEspera.key});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});
      console.error(err);
    }
    
  }
}