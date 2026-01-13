require("dotenv").config();

const prefixo = process.env.PREFIXO

const botName = "Yuki"

const version = "4.5.3"

const numberOwner = "188123996786820@lid"

const numberBotJid = "21910056837@s.whatsapp.net";

const numberBot = "241725708722215@lid"

let logs = true;

module.exports = {
  prefixo,
  numberBot,
  numberOwner,
  botName,
  version,
  numberBotJid
}