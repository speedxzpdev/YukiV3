

module.exports = {
  name: "gay",
  categoria: "diversao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      
      let frase;
      
      const porcentagem = Math.floor(Math.random() * 100);
      
      if(porcentagem < 10) {
        frase = `Estou apenas observando...`
      }
      else if(porcentagem < 25) {
        frase = `Já aprensentou indícios... Mais nada que dê pra comprovar.`
      }
      else if(porcentagem < 50) {
        frase = `Esse tá saindo do armário aos poucos...`
      }
      else if(porcentagem < 70) {
        frase = `Eita... Acabamos de encontrar um divo, JURO AMIGA!`
      }
      else if(porcentagem < 100) {
        frase = `Hum... Esse é especialista em rebolar pros amiguin`;
      }
      
      
      
      await sock.sendMessage(from, {image: {url: "https://files.catbox.moe/267hbh.jpg"}, caption: `O @${sender.split("@")[0]} é... 🌈${porcentagem}% Gay. ${frase}`, mentions: [sender]}, {quoted: msg});

    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
}