const { useMultiFileAuthState, makeWASocket, makeCacheableSignalKeyStore, requestPairingCode, baileys } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const P = require("pino");
const fs = require("fs");
const path = require("path")
const commandsMap = new Map();
const qrcode = require("qrcode-terminal");

const { prefixo, botName } = require("./config");
const tiktokDl = require("./utils/tiktok");
const connectDB = require("./lib/mongoDB.js");
const similarityCmd = require("./utils/similaridadeCmd");
const { users } = require("./database/models/users");
const { donos } = require("./database/models/donos");
const { rankativos } = require("./database/models/rankativos");
const { grupos } = require("./database/models/grupos");
const { redisConnect } = require("./lib/redis.js");
const os = require("os");
require("dotenv").config({quiet: true});
const server = require("./server.js");




const commandDir = fs.readdirSync(path.join(__dirname, "commands")).filter(cmd => cmd.endsWith(".js"));

//funcao que carrega os comandos de forma recursiva
function loadCommands(dir) {
  //nome de cada arquivo da pasta commands
  const files = fs.readdirSync(dir);
//loop que busca cada arquivo
  for (const file of files) {
    //busca o arquivo pelo nome se n estiver denreo de uma pasta
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    //se estiver
    if (stat.isDirectory()) {
      loadCommands(fullPath); // RECUSIVO: entra na pasta
    } else if (file.endsWith(".js")) {
      //carrega todos os comandos que tem .js no final
      const command = require(fullPath);
      
      if (!command.name || !command.execute) {
        console.log(`Arquivo ignorado (faltando estrutura): ${fullPath}`);
        continue;
      }
      //adiciona o comando no map
      commandsMap.set(command.name, command);
      
      
      
    }
  }
}

loadCommands(path.join(__dirname, "commands"));
console.log(`NOME: ${botName}
COMANDOS: ${commandsMap.size}
SISTEM: ${os.type()}`);


const jsonErros = require("./database/erros.json");
const erros_prontos = jsonErros[Math.floor(Math.random() * jsonErros.length)]

const jsonEspera = require("./database/espera.json");
const espera_pronta = jsonEspera[Math.floor(Math.random() * jsonEspera.length)]



async function yukibot() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "/assets/auth"));
  //sock do bot
  const sock = makeWASocket({
    logger: P({level: "error"}),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({level: "error"}))
    }
  });
  
          //conecta o mongo
    try {await connectDB();}
    catch(err){console.log("Nao foi possivel se conectar ao mongoDB\n\n", err); process.exit()}
  
    //Conecta o redis
    await redisConnect();
  
  sock.ev.on("creds.update", saveCreds);
  
  if(!state.creds.registered) {
    setTimeout(async () => {
      const code = await sock.requestPairingCode(process.env.NUMBER);
    console.log("Codigo: ", code);
    }, 2000);
  }
  

  
  
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, disconnectReason, qr } = update
    
    
    if (connection === "close") {
    const shouldReconnect =
      lastDisconnect?.error?.output?.statusCode !== 401

    if(shouldReconnect) {
      console.log("Reconectando seu merda…")
      yukibot()
    } else {
      console.log("Sessão inválida, apaga a pasta auth, seu lixo.")
    }
  } else if (connection === "open") {
    console.log("Conectado, caralho!")
  }
    
    
    
  });

//chama o backend da bot
server(sock);

//importacoes de eventos
  require("./events/messages.js")(sock, commandsMap, erros_prontos, espera_pronta);
  require("./events/participantUp")(sock);
  require("./events/waifus.js")(sock);
  require("./events/payments.js")(sock);
  
}

yukibot();