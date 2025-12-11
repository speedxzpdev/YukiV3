const { rankativos } = require("../../database/models/rankativos");

module.exports = {
  name: "rankativos",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      const array = await rankativos.find({from: from}).sort({msg: -1}).limit(10);
      
      const list = array.map((item, indice) => {
        return `${indice + 1} @${item.userLid.split("@")[0]} \nmensagens: ${item.msg}\nComandos usados: ${item.cmdUsados}`
      })
      
      const mencao = array.map(i => i.userLid)
      
      
      
      await sock.sendMessage(from, {text: `Rank de atividade\n\n${list.join("\n\n")}`, mentions: mencao}, {quoted: msg});
      
      
      
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
    
    
  }
}