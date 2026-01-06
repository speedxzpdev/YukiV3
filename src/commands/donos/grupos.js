const { grupos } = require("../../database/models/grupos");
const { donos } = require("../../database/models/donos");

module.exports = {
  name: "listargrupos",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const sender = msg.key.participant
      
      const donoSender = await donos.findOne({userLid: sender});
      
      if(!donoSender) {
        await sock.sendMessage(from, {text: "Só donos podem usar essa merda!"}, {quoted: msg});
        return
      }
      
      const esperaMsg = await sock.sendMessage(from, {text: "Buscando grupos..."}, {quoted: msg});
      
      const gruposArray = await grupos.find();
      
      
      
      const list = gruposArray.map((item, indice) => {
        
        const diasMs = 24 * 60 * 60 * 1000
      
      const agora = Date.now()
      
      const restanteMs = item?.aluguel?.getTime() - agora
      
      const restanteDias = Math.max(0, Math.ceil(restanteMs / diasMs))
        
        return `${indice + 1}. ${item?.grupoName || "Sem nome"}
*Aluguel:* ${restanteDias || 0} dias restantes
*Dono:* @${item?.ownerId.split("@")[0] || "Sem dono"}`
        
      });
      
      await sock.sendMessage(from, {text: `𝗟𝗶𝘀𝘁𝗮 𝗱𝗲 𝗴𝗿𝘂𝗽𝗼𝘀\n\n${list.join("\n\n")}`, edit: esperaMsg.key, mentions: gruposArray.map(o => o.ownerId)});
      
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
}