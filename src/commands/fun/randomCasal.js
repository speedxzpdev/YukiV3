

module.exports = {
  name: "casal",
  categoria: "diversao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      await sock.sendMessage(from, {react: {text: "💕", key: msg.key}});
      
      const metadata = await sock.groupMetadata(from);
      
      const participants = metadata.participants.map(p => p.id);
      
      let pessoa1, pessoa2
      
      pessoa1 = participants[Math.floor(Math.random() * participants.length)];
      //enquanto pessoa 1 e pessoa 2 forem iguais
      do {
        //sorteia denovo
        pessoa2 = participants[Math.floor(Math.random() * participants.length)];
        
      } while(pessoa1 === pessoa2)
      
      const amor = Math.floor(Math.random() * 100);
      
      await sock.sendMessage(from, {text: `💕Novo casal do dia... @${pessoa1.split("@")[0]} + @${pessoa2.split("@")[0]} = ❤️${amor}%`, mentions: [pessoa1, pessoa2]}, {quoted: msg});
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.log(err);
    }
    
  }
}