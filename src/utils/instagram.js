const axios = require("axios");
const { users } = require("../database/models/users");
const { normalizeUserLid } = require("./normalizeUserLid");

async function instaDl(sock, msg, from, body, erros_prontos, espera_pronta) {
  
  try {
    
    if(!body) {
      await sock.sendMessage(from, {text: "Cadê o link? Porra"}, {quoted: msg})
      return
    }
    
    await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg})
    
    const req = await axios.get(`https://zero-two-apis.com.br/api/instagram?url=${body}&apikey=${process.env.ZEROTWO_APIKEY}`)
    
    const data = req.data
    
    await sock.sendMessage(from, {video: {url: data.resultados[0].url}, caption: "Yuki reels!"}, {quoted: msg});
    
    const sender = normalizeUserLid(
      msg?.key?.participantLid ||
      msg?.key?.senderLid ||
      msg?.key?.participant ||
      msg?.key?.remoteJid
    );

    await users.updateOne({userLid: sender}, {$inc: {donwloads: 1}});
    
    
    
  }
  catch(err) {
    await sock.sendMessage(from, {text: erros_prontos}, {quotes: msg});
    console.error(err)
  }
  
  
  
  
}

module.exports = instaDl
