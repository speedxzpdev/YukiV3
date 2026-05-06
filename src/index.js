const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, requestPairingCode, baileys, fetchLatestBaileysVersion, Browsers} = require("whaileys");
const { Boom } = require("@hapi/boom");
const SockBot = require("./sock.js");
const P = require("pino");
const fs = require("fs");
const path = require("path");
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
require("dotenv").config({ quiet: true });
const server = require("./backend/server.js");

let isBooting = false;
let reconnectTimeout = null;

const commandDir = fs.readdirSync(path.join(__dirname, "commands")).filter((cmd) => cmd.endsWith(".js"));

function loadCommands(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadCommands(fullPath);
    } else if (file.endsWith(".js")) {
      const command = require(fullPath);

      if (!command.name || !command.execute) {
        console.log(`Arquivo ignorado (faltando estrutura): ${fullPath}`);
        continue;
      }

      commandsMap.set(command.name, command);
    }
  }
}

loadCommands(path.join(__dirname, "commands"));
console.log(`NOME: ${botName}
COMANDOS: ${commandsMap.size}
SISTEM: ${os.type()}`);

const jsonErros = require("./database/erros.json");
const erros_prontos = jsonErros[Math.floor(Math.random() * jsonErros.length)];

const jsonEspera = require("./database/espera.json");
const espera_pronta = jsonEspera[Math.floor(Math.random() * jsonEspera.length)];

function scheduleReconnect(reason = "motivo desconhecido") {
  if (reconnectTimeout) return;

  console.log(`Reiniciando Yuki em 5s. Motivo: ${reason}`);

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    yukibot().catch((err) => {
      console.error("Falha ao reiniciar a Yuki:", err);
      scheduleReconnect("falha ao reiniciar");
    });
  }, 5000);
}

async function connectMongoWithRetry(maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await connectDB();
      return true;
    } catch (err) {
      console.error(`Nao foi possivel se conectar ao mongoDB (tentativa ${attempt}/${maxAttempts})`, err);

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  return false;
}

async function yukibot() {
  if (isBooting) return;
  isBooting = true;

  const logo = `â–ˆâ–„â–ˆ â–ˆâ–‘â–ˆ â–ˆâ–„â–€ â–ˆ â–ˆâ–„â–„ â–ˆâ–€â–ˆ â–€â–ˆâ–€
â–‘â–ˆâ–‘ â–ˆâ–„â–ˆ â–ˆâ–‘â–ˆ â–ˆ â–ˆâ–„â–ˆ â–ˆâ–„â–ˆ â–‘â–ˆâ–‘`;

  console.log(logo);

  try {
    const mongoReady = await connectMongoWithRetry();
    if (!mongoReady) {
      scheduleReconnect("falha ao conectar no MongoDB");
      return;
    }

    await redisConnect();

    const sock = await SockBot.init();

    sock.ev.on("connection.update", async (update = {}) => {
      const { connection, lastDisconnect, qr } = update;

      if (SockBot.QRcode && qr) {
        console.log("qrcode:");
        console.log(qr);
      }

      if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;

        if (shouldReconnect) {
          console.log("Conexao encerrada, tentando reconectar...");
          scheduleReconnect("conexao fechada");
        } else {
          console.log("Sessao invalida, apague a pasta auth para parear novamente.");
        }
      } else if (connection === "open") {
        console.log("Conectado!");
      }
    });

    server(sock);
    require("./events/messages.js")(sock, commandsMap, erros_prontos, espera_pronta);
    require("./events/participantUp")(sock);
    require("./events/waifus.js")(sock);
  } catch (err) {
    console.error("Falha ao iniciar a Yuki:", err);
    scheduleReconnect("erro na inicializacao");
  } finally {
    isBooting = false;
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection capturada:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception capturada:", error);
});

yukibot();
