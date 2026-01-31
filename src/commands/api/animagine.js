

module.exports = {
  
  name: "animagine",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    try {
    const texto = args.slice(0).join(" ").trim();
    
    const prompt = encodeURIComponent(texto);
    
    
    
    const resp = [`Gerando ${texto}, espere só um momento...`, `Ok, Acabei de enviar uma solicitação pra gerar ${texto}!`, `Enviando sua ideia direto pra ia!`, `Carregando ${texto}, só um momentinho...`];
    
    const randomResp = resp[Math.floor(Math.random() * resp.length)]
    
    if(!texto) {
      await sock.sendMessage(from, {text: `Use "/animagine <prompt>`}, {quoted: msg});
      return
    }
    
    await sock.sendMessage(from, {text: randomResp}, {quoted: msg});
    
    const img = `https://zero-two-apis.com.br/api/ia/animagine?prompt=${prompt}&apikey=${process.env.ZEROTWO_APIKEY}`
    
    
    await sock.sendMessage(from, {image: {url: img}, caption: texto}, {quoted: msg});
    
  }
  catch(err) {
    await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
    console.error(err);
  }
  
  
  
}
  
}