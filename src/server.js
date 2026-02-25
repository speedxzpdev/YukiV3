const express = require("express");
const { clientRedis } = require("./lib/redis.js");
const { payment } = require("./lib/mercadoPago.js");
const { grupos } = require("./database/models/grupos.js");
const { numberOwner } = require("./config.js");

module.exports = async function server(sock) {
  
  const app = express();
  
  //ouvi json 
  app.use(express.json());
  
  const port = 80;
  
  
  app.get("/", async (req, res) => {
    await res.status(200).json({res: "ok!"});
  });
  
  app.post("/webhook", async (req, res) => {
    try {
      console.log("Post recebida!!");
      console.log(req.body)
      const body = req.body;
      
      if(body.type === "payment" && body.data?.id) {
        const status = await payment.get({id: body.data.id});
        
        const aluguel = await clientRedis.hGetAll(`payment:${body.data.id}`);
        
        const foipago = await clientRedis.exists(`id:${body.data.id}`);
        
        if(status.status === "approved" && status.transaction_amount=== Number(aluguel.valor) && foipago === 0) {
          
          
          
          const metadataGroup = await sock.groupMetadata(aluguel.groupId);
          
          await sock.sendMessage(aluguel.user, {text: `🥳Pagamento concluído! ${aluguel.dias} dias serão adicionando ao grupo: ${metadataGroup.subject} 🎉`});
          
          const diasTimestamp = 1000 * 24 * 60 * 60 * Number(aluguel.dias);
          
          //adiciona os dias;
          await grupos.updateOne({groupId: aluguel.groupId}, {$set: {aluguel: Date.now() + diasTimestamp}}, {upsert: true});
          
          await sock.sendMessage(aluguel.groupId, {text: `O @${aluguel.user.split("@")[0]} patrocinou o aluguel da yuki pra galera! 🥳🎉`, mentions: [aluguel.user]});
          
          await sock.sendMessage(numberOwner, {text: `Pagamento concluido🎉\nNome: ${aluguel.user.split("@")[0]}\nGrupo:${metadataGroup.subject}\nvalor: ${aluguel.valor}\ndias: ${aluguel.dias}`, mentions: [aluguel.user]});
          
          await clientRedis.set(`id:${body.data.id}`, 1);
          await clientRedis.expire(`id:${body.data.id}`, 20);
          
        }
        
      }
      await res.sendStatus(200);
      
    }
    catch(e) {
      console.log(e);
      await res.sendStatus(500);
    }
    
  });
  
  
  app.listen(port, () => {
    console.log(`Backend iniciado em: http://localhost:${port}`);
  });
  
  
}