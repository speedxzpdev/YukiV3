require("dotenv").config({quiet: true});

//Prefixo da bot
const prefixo = process.env.PREFIXO

//Nome do bot
const botName = "Yuki"

//Versao do bot
const version = "4.5.3"

//Lid do dono
const numberOwner = "188123996786820@lid"

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
  botName,
  version,
  numberBotJid
}