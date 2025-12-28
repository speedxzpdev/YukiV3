module.exports = {
  name: "gostosa",
  categoria: "diversao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      let frase;
      
      const porcentagem = Math.floor(Math.random() * 100);
      
      if(porcentagem < 10) {
        frase = `Eu tô com pena...`
      }
      else if(porcentagem < 25) {
        frase = `Hum... Alguns até devem prestar atenção em você`
      }
      else if(porcentagem < 50) {
        frase = `Uiui... Tô até sentindo um negocio aqui...`
      }
      else if(porcentagem < 70) {
        frase = `Rapaiz... Essa aí deve ter ums 100 caras na dm dela...`
      }
      else if(porcentagem < 100) {
        frase = `Nem eu tô me resistindo...`;
      }
      
      const sender = msg.key.participant
      
      await sock.sendMessage(from, {image: {url: "https://files.catbox.moe/9boo46.jpg"}, caption: `O @${sender.split("@")[0]} é... 😳${porcentagem}% Gostosona. ${frase}`, mentions: [sender]}, {quoted: msg});

    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
}