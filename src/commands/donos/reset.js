const { donos } = require("../../database/models/donos");


module.exports = {
  name: "reset",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    async function reconnectSocket() {
      if (sock?.ws && typeof sock.ws.close === "function") {
        sock.ws.close();
        return true;
      }

      if (typeof sock?.end === "function") {
        await sock.end(new Error("Reset solicitado pelo dono"));
        return true;
      }

      return false;
    }

    try {
      
      
      
      
      const donoSender = await donos.findOne({userLid: sender});
      
      if(!donoSender) {
        await sock.sendMessage(from, {text: "Tu não é dono, viadinho!"}, {quoted: msg});
        return;
      }
      
      await sock.sendMessage(from, {text: "Irei reiniciar a conexão em 3 segundos..."});
      
      setTimeout(() => {
        (async () => {
          const restarted = await reconnectSocket();
          
          if(!restarted) {
            await sock.sendMessage(from, {text: "Nao consegui reiniciar automaticamente. Reinicie o processo manualmente."}, {quoted: msg});
          }
        })().catch((error) => {
          console.error("Erro ao tentar resetar a conexao:", error);
        });
      }, 3000);
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
    
  }
}
