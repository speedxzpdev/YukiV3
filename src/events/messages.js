const { prefixo, numberBot } = require("../config");
const tiktokDl = require("../utils/tiktok");
const connectDB = require("../database/index");
const similarityCmd = require("../utils/similaridadeCmd");
const { users } = require("../database/models/users");
const { donos } = require("../database/models/donos");
const { rankativos } = require("../database/models/rankativos");
const { grupos } = require("../database/models/grupos");
const instaDl = require("../utils/instagram");
const { mutados } = require("../database/models/mute");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const menu = require("../utils/menu");



    //Parte que lida com mensagens em lotes
    //fila de mensagens de cada grupo
    let messageQueue = new Map();
    //flag pra evitar que seja rodado 2 msg ao mesmo tempo por grupo
    let flagMessage = new Map();
    
    //parte que lida com cada mensagem
    async function processMessage(groupId) {
      //caso já estiver true um processamento
      if(flagMessage.get(groupId)) return;
      //se nao ativa o true e continua
      flagMessage.set(groupId, true);
      
      const queue = messageQueue.get(groupId);
      
      //enquanto messageQueue for maior que zero
      while(queue.length > 0) {
        //pega a primeira mensagem
        const messageFuc = queue.shift();
        
        try {
          //e executa
          await messageFuc();
        }
        catch(err) {
          // se der erro printa
          console.error("Erro ao processar mensagem", err);
        }
              //cria uma nova promise
      await new Promise(resolve => setTimeout(resolve, 1000 * 3));
      }
      flagMessage.set(groupId, false);
    }


module.exports = (sock, commandsMap, erros_prontos, espera_pronta) => {
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0]
    //caso nao tenha mensagens
    if(!msg) return;
    
    const grupoRemote = msg.key.remoteJid
    
              //Se o grupo nao foi iniciado
      if(!messageQueue.has(grupoRemote)) {
        //Cria a lista de cada grupo
        messageQueue.set(grupoRemote, []);
        //marca como false
        flagMessage.set(grupoRemote, false);
      }
    
    //adiciona tudo em uma fila
    messageQueue.get(grupoRemote).push(async () => {
          //escopo pra Nao vazar variaveis
     {
    //pega o ms da msg
    const msgTime = msg.messageTimestamp * 1000
    //pega o ms atual
    const agora = Date.now();
    
    const msgTemp = agora - msgTime
    //se for mensagem de 10 seg ingnora
    if(msgTemp >= 20000) return;
    
    }
    //lê todas mensagens
    await sock.readMessages([msg.key]);
    //ingnora mensagens de si mesmo
    if (msg.key.fromMe) return
    const from = msg?.key.remoteJid || msg?.key.remoteJidAlt

    
   const mentions =
  msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    const sender = msg.key.participant || msg.key.remoteJid

    const doninhos = await donos.findOne({userLid: sender});
    
    const donosFrom = await donos.findOne({userLid: msg?.key.remoteJid});
    
    //Instancia do gemini
    const ia = new GoogleGenAI({apiKey: process.env.GEMINI_APIKEY});
    //promp base pra yuki
    const promptBase = `
Você é Yuki, uma bot de WhatsApp engraçada e direta. Não permita assuntos sexuais ou explícitos.
- Use o nome do usuário apenas se fizer sentido.
- Se perguntarem sobre comandos, use o mapa de comandos: ${JSON.stringify(commandsMap)}
- Prefixo de comando: "/"
- Se perguntarem sobre o dono: o dono é Speed, ele trabalha na bot todo dia. Você é mulher. POR FAVOR DE MANEIRA ALGUMA FALE COISAS SEXUAIS
Responda apenas à mensagem do usuário, de forma curta e direta.
`;
    //Se uma mensagem Nao vier de um grupo entao ele pausa os comandos
    if(!from.endsWith("@g.us") && !donosFrom) return;
    //se uma mensagem for de um grupo registra.
    if(from.endsWith("@g.us")) {
      
      if(!await grupos.findOne({groupId: from})) {
        
        const groupDados = await sock.groupMetadata(from);
        
      await grupos.create({groupId: from, grupoName: groupDados.subject});
    }
      
    }
    

    const groupDBInfo = await grupos.findOne({groupId: from});

    if(!await users.findOne({userLid: msg.key.participant})) {
      await users.create({userLid: msg.key.participant || msg.key.remoteJid, name: msg.pushName || "Sem nome"});
    }

    await rankativos.updateOne({userLid: msg.key.participant, from: from}, {$inc: {msg: 1}}, {upsert: true})

     //se estiver alguem mutado
    if(await mutados.findOne({userLid: msg.key.participant, grupo: from})) {
      try {
      const userMutado = await mutados.findOne({userLid: msg.key.participant, grupo: from});
      //apaga todas as msg
      await sock.sendMessage(userMutado.grupo, {delete: msg.key})
      
      const muteTentativa = await mutados.findOneAndUpdate({userLid: msg.key.participant, grupo: from}, {$inc: {tentativasMsg: 1}}, {new: true});
      //se a pessoa for desmutada antes
      if(!muteTentativa) return;
      //se ela tentar mandar mais de 3 mensagens
      if(muteTentativa.tentativasMsg >= 3) {
        //remove ela do grupo
        await sock.groupParticipantsUpdate(muteTentativa.grupo, [muteTentativa.userLid], 'remove');
        //apaga ela da colessao
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
    
    
    
    const bodyCase = body.toLowerCase()
    //caso ouva uma mencao ou frase com a yuki
    if(mentions.includes('239165908242449@lid') || bodyCase.startsWith("yuki") || bodyCase.startsWith("bot")) {
        
        try {
          //simula escrita
          await sock.sendPresenceUpdate("composing", from);
          //separa cada palavra
          const args = body.split(" ")
          //estrutura de resposta
          const response = await ia.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: [
              {text: promptBase},
              {text: `nome: ${msg.pushName}, mensagem: ${args.slice(1).join(" ").trim()}`}]
          });
          //manda a mensagem
          await sock.sendMessage(from, {text: response.text}, {quoted: msg});
          //pausa a simulacao
          await sock.sendPresenceUpdate("paused", from);
          
        }
        catch(err) {
          console.error(err);
          //caso o erro for de requisicao
          if(err.status === 429) {
            await sock.sendMessage(from, {text: "Limite de requisição atigindo, espere alguns instantes."}, {quoted: msg})
          }
        }
      }
  



  const groupReply = await grupos.findOne({groupId: from});
  //caso o grupo tenha autoreply ativo
  if(groupReply && groupReply.autoReply) {
    
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

  //Caso uma mensagem comece com prefixo
  if(body.startsWith("prefixo")) {
    await sock.sendMessage(from, {text: `O prefixo atual deste grupo é: \`${groupDBInfo.configs.prefixo}\``})
  }

  //caso tenha um link de tiktok
  if (body.startsWith("https://vt.tiktok.com/")) {

    tiktokDl(sock, msg, from, body, erros_prontos, espera_pronta);

  }
  
  if(body.startsWith("https://www.instagram.com/reel")) {
    instaDl(sock, msg, from, body, erros_prontos, espera_pronta)
  }


  let userFind = await users.findOne({userLid: msg.key.participant});

//tratamento dos comandos
  if (body.startsWith(prefixo)) {
    const args = body.slice(prefixo.length).trim().split(/ +/);
//pega o argumento digitado e deixa ele em letras minusculas
    const commandName = args.shift().toLowerCase();
  //procura no map
  const commandGet = commandsMap.get(commandName)

//se nao existir
    if (!commandGet) {

      const commandNameList = Array.from(commandsMap.keys());


//confere a similaridade de ambos
     const similarity = similarityCmd(commandNameList, commandName);


//caso for menor que 30
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
//escolhe uma mensagem aleatoriamente
        const cmdInvalidMsg = mensagensCmdInvalido[Math.floor(Math.random() * mensagensCmdInvalido.length)];

        await sock.sendMessage(from, {text: cmdInvalidMsg}, {quoted: msg});
        return
      }


//caso tenha um comando similar
      sock.sendMessage(from, {text: `😅 Eita, ${msg.pushName}! Parece que você errou o comando… Queria dizer "${prefixo}${similarity.sugest}" talvez? Similaridade: ${similarity.similarity}%`}, {quoted: msg});
      return
    }
    
    //busca um grupo
    const grupoFun = await grupos.findOne({groupId: from});
    
    //se um comando for de diversao
    if (commandGet.categoria && commandGet.categoria === "diversao") {
      //se nao tiver o modobrincadeira ativo
      if(!grupoFun?.configs?.cmdFun) {
        await sock.sendMessage(from, {text: "Modo brincadeira desativado no grupo. Peça pra um admin usar /modobrincadeira 1"}, {quoted: msg});
        return
      }
    }
    
    //executa o comando
    await commandGet.execute(sock, msg, from, args, erros_prontos, espera_pronta);
//adiciona no contador de comandos
    await rankativos.updateOne({userLid: msg.key.participant, from: from}, {$inc: {cmdUsados: 1}}, {upsert: true})

  }
    });
    
    //chama a funcao que processa cada mensagem
    processMessage(grupoRemote);
    
    


  });


}