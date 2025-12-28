module.exports = {
  name: "gostoso",
  categoria: "diversao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      let frase;
      
      const porcentagem = Math.floor(Math.random() * 100);
      
      if(porcentagem < 10) {
        frase = `O bixin é tão judiado que me dá dó...`
      }
      else if(porcentagem < 25) {
        frase = `Ah... Ele tem chance vai... Com uma cega talvez...`
      }
      else if(porcentagem < 50) {
        frase = `É pouca coisa, mais já é alguma coisa`
      }
      else if(porcentagem < 70) {
        frase = `As muié pira cara!!!`
      }
      else if(porcentagem < 100) {
        frase = `Eita... Cuidado pra não roubar todas as mulheres do mundo pra você...`;
      }
      
      const sender = msg.key.participant
      
      await sock.sendMessage(from, {image: {url: "https://files.catbox.moe/lawr5v.jpg"}, caption: `O @${sender.split("@")[0]} é... 🧐${porcentagem}% Gostosão. ${frase}`, mentions: [sender]}, {quoted: msg});

    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
}