const { prefixo } = require("../config");
const tiktokDl = require("../utils/tiktok");
const connectDB = require("../database/index");
const similarityCmd = require("../utils/similaridadeCmd");
const { users } = require("../database/models/users");
const { donos } = require("../database/models/donos");
const { rankativos } = require("../database/models/rankativos");
const { grupos } = require("../database/models/grupos");
const instaDl = require("../utils/instagram");
const { mutados } = require("../database/models/mute");



module.exports = (sock, commandsMap, erros_prontos, espera_pronta) => {
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0]
    await sock.readMessages([msg.key])
    if (msg.key.fromMe) return
    const from = msg?.key.remoteJid || msg?.key.remoteJidAlt
    connectDB();
    const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const sender = msg.key.participant || msg.key.remoteJid

    const doninhos = await donos.findOne({userLid: sender});

    if(!from.endsWith("@g.us") && !doninhos) return;
    if(from.endsWith("@g.us")) {
      
      if(!await grupos.findOne({groupId: from})) {
      await grupos.create({groupId: from});
    }
      
    }
    

    const groupDBInfo = await grupos.findOne({groupId: from});

    if (mention.includes("11051571658890@lid")) {

      const figList = ["https://files.catbox.moe/99k6q0.webp", "https://files.catbox.moe/866c5t.webp", "https://files.catbox.moe/k1xm6g.webp"];

      const figrandom = figList[Math.floor(Math.random() * figList.length)];

      await sock.sendMessage(from, {sticker: {url: figList[1]}}, {quoted: msg});
    }


    if(!await users.findOne({userLid: msg.key.participant})) {
      await users.create({userLid: msg.key.participant || msg.key.remoteJid})
    }

    await rankativos.updateOne({userLid: msg.key.participant, from: from}, {$inc: {msg: 1}}, {upsert: true})

     
    if(await mutados.findOne({userLid: msg.key.participant, grupo: from})) {
      try {
      const userMutado = await mutados.findOne({userLid: msg.key.participant, grupo: from});
      
      await sock.sendMessage(userMutado.grupo, {delete: msg.key})
      
      const muteTentativa = await mutados.findOneAndUpdate({userLid: msg.key.participant, grupo: from}, {$inc: {tentativasMsg: 1}}, {new: true});
      
      if(!muteTentativa) return;
      
      if(muteTentativa.tentativasMsg >= 3) {
        await sock.groupParticipantsUpdate(muteTentativa.grupo, [muteTentativa.userLid], 'remove');
        
        await mutados.deleteOne({userLid: msg.key.participant, grupo: from});
        
      }
      
      }
      
      catch(err) {
        console.error(err);
      }
      return
    }







    const body = (msg.message?.conversation) ||
    (msg.message?.extendedTextMessage?.text) ||
    (msg.message?.imageMessage?.caption) ||
    (msg.message?.documentMessage?.caption) || "Msg estranha..."

  const groupReply = await grupos.findOne({groupId: from});
  
  if(groupReply.autoReply === true) {
    
    const bodyCase = body.toLowerCase()
    
    if(bodyCase.includes("bom dia")) {
      
      await sock.sendMessage(from, {text: `Bom dia, ${msg.pushName}! Tudo bem?`}, {quoted: msg});
    }
    
    if(bodyCase.includes("boa tarde")) {
      await sock.sendMessage(from, {text: `Boa tarde, Lindão! Uma hora dessa, assitir um bleach é uma boa.`}, {quoted: msg});
    }
    
    if(bodyCase.includes("boa noite")) {
      await sock.sendMessage(from, {text: `Boa noite, meu fio. Vá dormir, vá`}, {quoted: msg});
    }
  }


  if(body.startsWith("prefixo")) {
    await sock.sendMessage(from, {text: `O prefixo atual deste grupo é: \`${groupDBInfo.configs.prefixo}\``})
  }


  if (body.startsWith("https://vt.tiktok.com/")) {

    tiktokDl(sock, msg, from, body, erros_prontos, espera_pronta);

  }

  if(body.startsWith("https://www.instagram.com")) {
    instaDl(sock, msg, from, body, erros_prontos, espera_pronta)
  }


  let userFind = await users.findOne({userLid: msg.key.participant});


  if (body.startsWith(prefixo)) {
    const args = body.slice(prefixo.length).trim().split(/ +/);

    const commandName = args.shift().toLowerCase();

  const commandGet = commandsMap.get(commandName)

    if (!commandGet) {

      const commandNameList = Array.from(commandsMap.keys());



     const similarity = similarityCmd(commandNameList, commandName);



      if (similarity.similarity <30) {

        const mensagensCmdInvalido = [`${msg.pushName}... procurei nessa merda toda e não achei esse comando!`,
  `${msg.pushName}... procurei pela PORRA dos meus comandos inteiros e não achei nada! Para de inventar moda, caralho!`,
  `${msg.pushName}, tu tá drogado? Esse comando nem existe, porra.`,
  `${msg.pushName}... que porra é essa que tu digitou? Meu cérebro eletrônico bugou.`,
  `${msg.pushName}, tentei entender teu comando e só achei vergonha.`,
  `${msg.pushName}, eu rodei meus scripts todos e não achei essa merda.`,
  `${msg.pushName}, esse comando aí foi tirado do cu, né?`,
  `${msg.pushName}... nem nos logs do inferno existe esse comando.`,
  `${msg.pushName}, inventando comando agora? Quer programar no meu lugar?`];

        const cmdInvalidMsg = mensagensCmdInvalido[Math.floor(Math.random() * mensagensCmdInvalido.length)];

        await sock.sendMessage(from, {text: cmdInvalidMsg}, {quoted: msg});
        return
      }



      sock.sendMessage(from, {text: `😅 Eita, ${msg.pushName}! Parece que você errou o comando… Queria dizer "${prefixo}${similarity.sugest}" talvez? Similaridade: ${similarity.similarity}%`}, {quoted: msg});
      return
    }
    await commandGet.execute(sock, msg, from, args, erros_prontos, espera_pronta);

    await rankativos.updateOne({userLid: msg.key.participant, from: from}, {$inc: {cmdUsados: 1}}, {upsert: true})

  }






  })


}