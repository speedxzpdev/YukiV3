// index.js
require("dotenv").config();
const { useMultiFileAuthState, makeWASocket, makeCacheableSignalKeyStore, requestPairingCode, baileys } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const P = require("pino");
const fs = require("fs");
const path = require("path");
const commandsMap = new Map();
const qrcode = require("qrcode-terminal");

const { prefixo } = require("./config");
const tiktokDl = require("./utils/tiktok");
const connectDB = require("./database/index");
const similarityCmd = require("./utils/similaridadeCmd");
const { users } = require("./database/models/users");
const { donos } = require("./database/models/donos");
const { rankativos } = require("./database/models/rankativos");
const { grupos } = require("./database/models/grupos");

const commandDir = fs.readdirSync(path.join(__dirname, "commands")).filter(cmd => cmd.endsWith(".js"));

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

const jsonErros = require("./database/erros.json");
const erros_prontos = jsonErros[Math.floor(Math.random() * jsonErros.length)];

const jsonEspera = require("./database/espera.json");
const espera_pronta = jsonEspera[Math.floor(Math.random() * jsonEspera.length)];

async function yukibot() {
  // conecta ao Mongo uma vez na inicialização
  try {
    console.log("Conectando ao banco de dados...");
    await connectDB();
    console.log("Mongo conectado.");
  } catch (e) {
    console.error("Erro ao conectar no MongoDB:", e);
    // se não tiver DB, decide o que fazer: aqui só logamos e seguimos (algumas operações DB vão falhar)
    // você pode preferir process.exit(1) pra não subir o bot sem DB
  }

  const { state, saveCreds } = await useMultiFileAuthState("./auth");

  const sock = makeWASocket({
    logger: P({ level: "error" }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: "error" }))
    }
  });

  sock.ev.on("creds.update", saveCreds);

  if (!state.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(process.env.NUMBER);
        console.log("Codigo: ", code);
      } catch (e) {
        console.log("Não foi possível solicitar pairing code:", e?.message || e);
      }
    }, 2000);
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, disconnectReason, qr } = update;
    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
      if (shouldReconnect) {
        console.log("Reconectando seu merda…");
        yukibot();
      } else {
        console.log("Sessão inválida, apaga a pasta auth, seu lixo.");
      }
    } else if (connection === "open") {
      console.log("Conectado, caralho!");
    }
  });

  // passa o sock já com DB conectado (ou ao menos tentamos conectar)
  require("./events/messages.js")(sock, commandsMap, erros_prontos, espera_pronta);
  require("./events/participantUp")(sock);
}

yukibot();
