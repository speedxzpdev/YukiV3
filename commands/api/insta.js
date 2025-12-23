const instaDl = require("../../utils/instagram.js");

module.exports = {
  name: "reels",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
    const link = args[0]?.trim();
    
    instaDl(sock, msg, from, link, erros_prontos, espera_pronta);
    }
  catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
}
}
