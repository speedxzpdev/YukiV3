const { donos } = require("../../database/models/donos");


module.exports = {
  name: "listadonos",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
    //Busca todos os documentos
    const donosTotal = await donos.find();
    //caso nao exista NENHUM DONO
    if(!donosTotal) {
      await sock.sendMessage(from, {text: "Não há donos registrados."}, {quoted: msg});
      return;
    }
    
    await sock.sendMessage(from, {text: "Buscando donos..."}, {quoted: msg});
    //Organiza cada pessoa bonitinha
    const list = donosTotal.map((item, indice) => {
      //retorna a string formatada
      return `${indice + 1}. @${item.userLid.split("@")[0]}`
    });
    
    //pega todos os id dos documentos
    const Lids = donosTotal.map(i => i.userLid);
    
    //envia o rank
    await sock.sendMessage(from, {text: list.join("\n\n"), mentions: Lids}, {quoted: msg});
      
    }
    //tratamento pra bugs
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
  }
}