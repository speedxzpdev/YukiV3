require("dotenv").config({quiet: true});
const { normalizeUserLid } = require("./utils/normalizeUserLid");

//Prefixo da bot
const prefixo = process.env.PREFIXO

//Nome do bot
const botName = "Yuki"

//Versao do bot
const version = "4.5.3"

//Lids dos donos
const ownerLids = [
  normalizeUserLid(process.env.SPEED_LID) || "188123996786820@lid",
  normalizeUserLid(process.env.LENOZ_LID) || "221856653123760@lid"
];

const numberOwner = ownerLids[0];

//jid do bot
const numberBotJid = "21910056837@s.whatsapp.net";

//Lid do bot
const numberBot = "241725708722215@lid"

//https://zero-two-apis.com.br
const apikey = process.env.ZEROTWO_APIKEY

module.exports = {
  prefixo,
  numberBot,
  numberOwner,
  ownerLids,
  botName,
  version,
  numberBotJid
}
