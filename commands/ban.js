const { numberOwner, numberBot } = require("../config");
const { donos } = require("../database/models/donos");

module.exports = {
  name: "ban",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      
      const sender = msg.key.participant
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant
  
     const metadados = await sock.groupMetadata(from);
     
     const Admins = metadados.participants.filter(p => p.admin);
  const groupAdmins = Admins.map(m => m.id);
  const donin = await donos.findOne({userLid: sender});
  
  
  if(!groupAdmins.includes(sender) && !donin) {
    const mensagensTentativaSemPerm = [
  `${msg.pushName}, tu não tem cargo pra isso, mano. Vai brincar de moderador em outro lugar.`,
  `Tentou banir sem permissão. O ego tá grande, mas o poder é zero.`,
  `O cara nem admin é e já quer expulsar os outros... humildade passou longe.`,
  `Sem ser admin e tentando banir? Que fase... vai arrumar o que fazer, campeão.`
];
const msgNoAdmin = mensagensTentativaSemPerm[Math.floor(Math.random() * mensagensTentativaSemPerm.length)];

await sock.sendMessage(from, {text: msgNoAdmin}, {quoted: msg});
return
  }
  
  if(!mention) {
    await sock.sendMessage(from, {text: "Menciona alguém zé bct."}, {quoted: msg});
    return
  }
  
  
    if(mention.includes(numberBot)) {
      const mensagensBanBot = [
  `Tu tá mesmo tentando me banir? CORAJOSO, hein.`,
  `${msg.pushName}, eu vi tua tentativa patética de me remover. Deixa eu rir rapidinho.`,
  `${msg.pushName}... achou que eu ia sair? Só saio quando o dono quiser, não quando um mortal tenta.`,
  `Se eu quisesse, era eu que te bania. Fica na tua.`,
  `Você tentou me banir e falhou. Parabéns, conseguiu nada.`,
  `Me banir? Eu sou o sistema, não um usuário. Aprende a diferença.`,
  `${msg.pushName}, próxima vez tenta com fé, talvez o milagre aconteça.`,
  `Tu me irritou, mas ainda tô rindo da tua audácia.`
];
      
      const banbotmsg = mensagensBanBot[Math.floor(Math.random() * mensagensBanBot.length)];
      
      
      await sock.sendMessage(from, {text: banbotmsg}, {quoted: msg});
      return
    }
    
    if(mention.includes(numberOwner)) {
      const mensagensBanDono = [
  `Se eu pudesse, te bania só por tentar tocar no criador.`,
  `${msg.pushName}, não se bane quem tem poder sobre a porra toda.`,
  `${msg.pushName}... sério mesmo que tu tentou isso? Que vergonha alheia.`
];
  
  const msgbanDono = mensagensBanDono[Math.floor(Math.random() * mensagensBanDono.length)];
  await sock.sendMessage(from, {text: msgbanDono}, {quoted: msg});
      return
    }
    
    if(await donos.findOne({userLid: mention})) {
      await sock.sendMessage(from, {text: "O cara é subDono zé bct"}, {quoted: msg});
      return
    }
    
    await sock.groupParticipantsUpdate(from, [mention], "remove");
    
    await sock.sendMessage(from, {text: "Usuário banido com sucesso!"}, {quoted: msg});
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
  }
}