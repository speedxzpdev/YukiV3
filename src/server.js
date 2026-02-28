const express = require("express");
const { clientRedis } = require("./lib/redis.js");
const { payment } = require("./lib/mercadoPago.js");
const { grupos } = require("./database/models/grupos.js");
const { numberOwner } = require("./config.js");
const axios = require("axios");
const { users } = require("./database/models/users.js");

async function refreshToken(token, user) {
  try {
    
    const response = await axios.post("https://accounts.spotify.com/api/token", new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token
    }), {headers:
      {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(process.env.CLIENT_SPOTIFY + ":" + process.env.SPOTIFY_KEY).toString("base64")}});
        
        await users.updateOne({userLid: user}, {$set: {"spotifyToken.token": response.data.access_token}}, {upsert: true});
        
        console.log(`token resetado para: ${response.data.access_token}`);
        
        return response.data.access_token
      }
  catch(err) {
    console.error(err);
  }
}

module.exports = async function server(sock) {
  
  const app = express();
  
  //ouvi json 
  app.use(express.json());
  
  const port = process.env.PORT;
  
  
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
  
  app.get("/spotifyLogin", (req, res) => {
    try {
      
      const id = req?.query?.idUser;
      
      const scope = "user-read-currently-playing"
      
      //monto a url
      const urlAuth = "https://accounts.spotify.com/authorize" + "?response_type=code" + "&client_id=" + process.env.CLIENT_SPOTIFY + "&scope=" + encodeURIComponent(scope) + "&redirect_uri=" + encodeURIComponent(process.env.URL_BACKEND + "/callback") + "&state=" + id
      
      res.redirect(urlAuth);
      
      
    }
    catch(err) {
      res.send(err);
      console.error(err)
    }
  });
  
  app.get("/callback", async (req, res) => {
    const code = req?.query?.code;
    const state = req?.query.state;
    try {
    
    if(!code || !state) {
      res.status(400).send("Code ausente.");
      return
    }
    
    const user = await clientRedis.hGetAll(`idUser:${state}`);
    
    const response = await axios.post("https://accounts.spotify.com/api/token", new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: process.env.URL_BACKEND + "/callback"
    }), {headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(process.env.CLIENT_SPOTIFY + ":" + process.env.SPOTIFY_KEY).toString("base64")
    }});
    
    await users.updateOne({userLid: user.userLid}, {$set: {spotifyToken: {refresh: response.data.refresh_token, token: response.data.access_token}}}, {upsert: true});
    
    res.status(200).send("ok, pode voltar para o whatsapp.");
    
    await sock.sendMessage(user.userLid, {text: "Spotify conectado com sucesso!"});
    
    }
    catch(err) {
      res.status(500).send(err);
    }
    
  });
  
  app.get("/music", async (req, res) => {
    const user = req?.query?.user
    
    try {
      if(!user) {
        res.status(400).send("Falta o parametro user!");
        return
      }
      
      const userDb = await users.findOne({userLid: user});
      
      if(!userDb) {
        res.status(404).send("Usuário não encontrado.");
        return
      }
      
      let token = userDb?.spotifyToken?.token;
      
      const refresh = userDb?.spotifyToken?.refresh_token;
      
      let response;
       
       try {
       response = await axios.get("https://api.spotify.com/v1/me/player/currently-playing", {headers:
        {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      console.log(response);
       }
       catch(e) {
         if(e?.response?.status === 401 && refreshToken) {
           token = await refreshToken(refreshToken, user);
         }
         
       }
      
      const data = response?.data;
      
      if(data.item) {
        res.status(200).json({
          nome: data.item.name,
          artistas: data.item.artists.map(a => a.name),
          album: data.item.album.name
        });
      }
      else {
        res.status(204).send("Não está ouvindo nada.");
      }
      
    }
    catch(err) {
      res.status(500).send(err);
      console.error(err);
    }
    
    
  });
  
  
  
  
  app.listen(port, () => {
    console.log(`Backend iniciado em: http://localhost:${port}`);
  });
  
  
}