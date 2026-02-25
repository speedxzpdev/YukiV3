const express = require("express");
const { clientRedis } = require("./lib/redis.js");
const { clientMp } = require("./lib/mercadoPago.js");



module.exports = async function server(sock) {
  
  const app = express();
  
  //ouvi json 
  app.use(express.json);
  
  const port = 80;
  
  
  app.get("/", async (req, res) => {
    await res.status(200).json({res: "ok!"});
  });
  
  app.post("/webhook", async (req, res) => {
    res.sendStatus(200);
  });
  
  
  app.listen(port, () => {
    console.log(`Backend iniciado em: http://localhost:${port}`);
  });
  
  
}