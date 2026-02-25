const express = require("express");
const { clientRedis } = require("./lib/redis.js");
const { clientMp } = require("./lib/mercadoPago.js");
const { grupos } = require("./database/models/grupos.js");


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
      const body = req.body;
      
      if(body.type === "payment" && body.data?.id) {
        const status = await clientMp.payment.byId(body.data.id);
        
        const aluguel = await clientRedis.hGetAll(`payment:${body.data.id}`);
        
        if(status.status === "approved" && status.transaction_amount=== Number(aluguel.valor)) {
          
          
          
          const metadataGroup = await sock.groupMetadata(aluguel.groupId);
          
          await sock.sendMessage(aluguel.user, {text: `Pagamento concluído! ${aluguel.dias} dias serão adicionando ao grupo: ${metadataGroup.subject}`});
          
          const diasTimestamp = 1000 * 24 * 60 * 60 * Number(aluguel.dias);
          
          //adiciona os dias;
          await grupos.updateOne({groupId: aluguel.groupId}, {$set: {aluguel: Date.now() + diasTimestamp}}, {upsert: true});
        }
        
      }
      await res.sendStatus(200);
      
    }
    catch(e) {
      console.log(e);
      await res.sendStatus(200);
    }
    
  });
  
  
  app.listen(port, () => {
    console.log(`Backend iniciado em: http://localhost:${port}`);
  });
  
  
}