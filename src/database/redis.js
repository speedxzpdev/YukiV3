const redis = require("redis");
require("dotenv").config();

//Cria o client
const clientRedis = redis.createClient({
  username: 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

//Faz a conexão
async function redisConnect() {
  try {
    await clientRedis.connect();
    console.log("Redis conectado!");
  }
  catch(err) {
    console.error("erro ao conectar redis:\n", err);
  }
  
}


module.exports = {
  clientRedis,
  redisConnect
}