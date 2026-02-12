const { prefixo, numberBot, numberOwner, numberBotJid } = require("../config.js");
const tiktokDl = require("../utils/tiktok");
const connectDB = require("../lib/mongoDB.js");
const similarityCmd = require("../utils/similaridadeCmd");
const { users } = require("../database/models/users");
const { donos } = require("../database/models/donos");
const { rankativos } = require("../database/models/rankativos");
const { grupos } = require("../database/models/grupos");
const instaDl = require("../utils/instagram");
const { mutados } = require("../database/models/mute");
const axios = require("axios");
const menu = require("../utils/menu");
const YukiBot = require("../utils/fuc");
const spotifyDl = require("../utils/spotify.js");
const { clientRedis } = require("../lib/redis.js");
const { clientMp, payment} = require("../lib/mercadoPago.js");
const{ yukiEv,
  comprarWaifu, pagamento } = require("../utils/events.js");

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
      
      //Decide um delay aleatorio entre 1 e 2
      const delayRandom = Math.max(1000, Math.floor(Math.random() * 2000));
      
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
      await new Promise(resolve => setTimeout(resolve, delayRandom * 2));
      }
      console.log(`Mensagem duplicada. Esperando ${delayRandom}`);
      //Depois dos 2 segundos ele seta pra false
      flagMessage.set(groupId, false);
    }
    
    //map de usos de comando
    const cooldown = new Map();
    
     //Lida com spams de mesmos comandos
    
    
    function spamCommand(user, command) {
      const LIMITE = 5;
      const TEMPO = 60 * 1000;
      const agora = Date.now();
      const key = `${user}:${command}`
      
      //Se nao existe cria
      if(!cooldown.has(key)) {
        cooldown.set(key, []);
      }
      
      //pega os usos 
      const usos = cooldown.get(key);
      
      //filtra por recentes
      const usosRecentes = usos.filter(tempo => agora - tempo < TEMPO);
      
      //adiciona o TEMPO
      usosRecentes.push(agora);
      //adiciona e volta pro Map
      cooldown.set(key, usosRecentes);
      
      //Retorna se usos recente for maior ou igual ao limite
      return usosRecentes.length >= LIMITE
      
    }

module.exports = (sock, commandsMap, erros_prontos, espera_pronta) => {
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    
    
    const from = msg?.key.remoteJid || msg?.key.remoteJidAlt
    
    if(process.env.DEV_AMBIENT === "true" && from !== '120363424415515445@g.us') return;
    //console.log(msg)
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
    //ignora mensagens de si mesmo
    if(process.env.DEV_AMBIENT === "false") {
    if (msg.key.fromMe) return
      
    }
    
    
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    
   const mentions =
  msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || ctx?.participant || [];
  
  

    const sender = msg.key.participant || msg.key.remoteJid

    const doninhos = await donos.findOne({userLid: sender});
    
    const bot = new YukiBot({sock: sock, msg});
    
    
    
    

    //Se uma mensagem Nao vier de um grupo entao ele pausa os comandos
    //user
    let usersSender = await users.findOne({userLid: sender});
    const Notvip = !usersSender?.vencimentoVip || Date.now() > usersSender?.vencimentoVip?.getTime();
    
    if(!from.endsWith("@g.us") && !doninhos && Notvip) {
      
      const IsMsgPV = await  clientRedis.exists(`pv:block:${sender}`);
      
      if(IsMsgPV === 1) return;
      
      await bot.reply(from, `Olá ${msg.pushName}, me adicione a um grupo para ver meu menu, caso deseja ter acesso liberado a Yuki use *${prefixo}alugar*, obrigada!`);
      
      await clientRedis.set(`pv:block:${sender}`, "1");
      
      await clientRedis.expire(`pv:block:${sender}`, 2 * 60);
      
      return;
    }
    //se uma mensagem for de um grupo registra.
    if(from.endsWith("@g.us")) {
      
      if(!await grupos.findOne({groupId: from})) {
        
        const groupDados = await sock.groupMetadata(from);
        
      await grupos.create({groupId: from, grupoName: groupDados.subject, ownerId: groupDados?.owner || "Sem dono"});
    }
      
    }
    

    const groupDBInfo = await grupos.findOne({groupId: from});
    
    

    if(!await users.findOne({userLid: msg.key.participant})) {
      await users.create({userLid: msg.key.participant || msg.key.remoteJid, name: msg.pushName || "Sem nome"});
      
      usersSender = await users.findOne({userLid: sender})
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
    (msg.message?.documentMessage?.caption) || "Msg estranha...";
    
    const bodyCase = body.toLowerCase();
    
    //argumentos 
    const args = body.slice(prefixo.length).trim().split(/ +/);
    
        
    //Caso tenha um aluguel a pagar
    const alugarExiste = await clientRedis.exists(`aluguel:${sender}&${from}`);
    if(alugarExiste) {
      
      const aluguelObj = await clientRedis.hGetAll(`aluguel:${sender}&${from}`);
      
      if(bodyCase === "confirmar") {
        try {
        await bot.reply(from, "Gerando copia e cola...");
        
        const paymentAluguel = await payment.create({
      body: {
      transaction_amount: Number(aluguelObj.valor),
  description: "Aluguel da Yuki!",
  payment_method_id: "pix",
  payer: {
    email: "yuki@gmail.com"
  }}
});
        const dataPix = paymentAluguel;
        
        const qrCodeAluguel = dataPix.point_of_interaction.transaction_data;
        
        const infoAluguelPay = `⤷ *Id:* ${dataPix.id}\n⤷ *Status:* ${dataPix.status}\n⤷ *Valor:* ${aluguelObj.valor}`;
        
        const qrBase64 = qrCodeAluguel.qr_code_base64.replace(/^data:image\/png;base64,/, "");
        const qrBuffer = Buffer.from(qrBase64, "base64");
        
        await sock.sendMessage(sender, {image: qrBuffer, caption: infoAluguelPay}, {quoted: msg});
        
        await bot.reply(sender, `*Aqui está seu copia e cola:*\n⤷ ${qrCodeAluguel.qr_code}`);
        
        await bot.reply(from, "Qr code e pix copia e cola enviado! Olhe seu privado.");
        
        await bot.reply(sender, "Esse pagamento vai se expirar em 10 minutos!");
        
        const payInterval = setInterval(async () => {
          try {
          const pagamentoAtual = await payment.get({ id: dataPix.id });
          
          const status = pagamentoAtual.status;
          
          if(status === "approved") {
            await bot.reply(sender, `Pagamento concluido🎉 ${aluguelObj.dias} dias serão adicionados ao seu grupo!`);
            
            //Emite o evento
            pagamento({
              ctx: {
                user: sender,
                from: aluguelObj.grupo,
              valor: dataPix?.transaction_amount
              },
              obj: {
                categoria: "assinaturas",
                descricao: dataPix?.description,
                id: dataPix?.id
              }
            });
            
            const diasEmTimestamp = 1000 * 60 * 60 * 24 * Number(aluguelObj.dias);
            
            await grupos.updateOne({groupId: aluguelObj.grupo}, {$set: {aluguel: diasEmTimestamp + Date.now()}}, {upsert: true});
            
            await clientRedis.del(`aluguel:${sender}&${aluguelObj.grupo}`);
            
            clearInterval(payInterval);
          }
          
          else if(status === "rejected") {
            await bot.send(sender, "Pagamento recusado...");
            await clientRedis.del(`aluguel:${sender}&${aluguelObj.grupo}`);
          }
          }
          catch(err) {
            await bot.reply(sender, "Erro ao verificar pagamento, fale com meu dono imediatamente!\n\⤷ https://api.whatsapp.com/send/?phone=%2B558791732587&text=Oi,%20Speed&type=phone_number&app_absent=0&wame_ctl=1");
            console.log(err);
            clearInterval(payInterval);
          }
        }, 5000);
        
        }
        catch(err) {
          await bot.reply(sender, "Erro encontrado fale com meu dono imediatamente!!\n\n⤷ https://api.whatsapp.com/send/?phone=%2B558791732587&text=Oi,%20Speed&type=phone_number&app_absent=0&wame_ctl=1");
          console.error(err);
          await clientRedis.del(`aluguel:${sender}&${from}`);
        }
        
        
      }
      
      else if(bodyCase === "cancelar") {
        
        await clientRedis.del(`aluguel:${sender}&${from}`);
        
        await bot.reply(from, "Poxa... Que pena, qualquer coisa já sabe! Usa */alugar*");
        
      }
      
    }
        
        
        
        //caso tenha uma aposta 
    const apostaPendente = await clientRedis.exists(`aposta:${sender}`);
    if(apostaPendente) {
      
      const apostaObject = await clientRedis.hGetAll(`aposta:${sender}`);
      
      if(bodyCase.includes("aceitar")) {
        try {
          
          const msgEspera = await sock.sendMessage(from, {text: "Apostando cara ou coroa... Vamos ver quem vai ganhar"}, {quoted: msg});
          
          const caraOuCora = Math.floor(Math.random() * 100);
          
          if(caraOuCora < 50) {
            await sock.sendMessage(from, {text: `Coroa! @${apostaObject.alvo.split("@")[0]} ganhou +${apostaObject.valor}`, mentions: [apostaObject.alvo], edit: msgEspera.key});
            //dá o dinheiro
            await users.updateOne({userLid: apostaObject.alvo}, {$inc: {dinheiro: apostaObject.valor}});
            //remove de quem perdeu
            await users.updateOne({userLid: apostaObject.autor}, {$inc: {dinheiro: -apostaObject.valor}})
            
            //apaga
            await clientRedis.del(`aposta:${sender}`);
          }
          else {
            await sock.sendMessage(from, {text: `Cara! @${apostaObject.autor.split("@")[0]} ganhou +${apostaObject.valor}`, mentions: [apostaObject.autor], edit: msgEspera.key});
            //dá o valor
            await users.updateOne({userLid: apostaObject.autor}, {$inc: {dinheiro: apostaObject.valor}});
            
            //remove de quem perdeu
            await users.updateOne({userLid: apostaObject.alvo}, {$inc: {dinheiro: -apostaObject.valor}})
            
            await clientRedis.del(`aposta:${sender}`);
          }
        }
        catch(err) {
          await bot.reply(from, erros_prontos);
          console.error(err);
        }
        
      }
      if(bodyCase.includes("recusar")) {
        await sock.sendMessage(from, {text: `Aposta de: @${apostaObject.autor.split("@")[0]} recusada!`, mentions: [apostaObject.autot]}, {quoted: msg});
      }
      
      await clientRedis.del(`aposta:${sender}`)
      return
    }
    
      //Caso tenha um user com pedido pendente
  const namoroPendente = await clientRedis.exists(`namoro:${sender}`);
  if(namoroPendente) {
    
    const namoroObject = await clientRedis.hGetAll(`namoro:${sender}`);
    
    if(bodyCase === "aceitar") {
      //Adiciona ao pedidor
      await users.updateOne({userLid: namoroObject?.autor}, {$set: {"casal.parceiro": namoroObject.alvo, "casal.pedido": new Date()}});
      //adiciona ao alvo 
      await users.updateOne({userLid: sender}, {$set: {"casal.parceiro": namoroObject.autor, "casal.pedido": new Date()}});
      
      //deleta o pedido dos pendentes 
      await clientRedis.del(`namoro:${sender}`);
      
      await sock.sendMessage(from, {text: `💕 Um novo amor começa entre @${namoroObject?.autor.split("@")[0]} e @${namoroObject?.alvo.split("@")[0]}💕`, mentions: [sender, namoroObject?.autor]}, {quoted: msg});
    }
    
    else if(bodyCase === "recusar") {
      
      await sock.sendMessage(from, {text: `Sinto muito @${namoroObject.autor.split("@")[0]} 😔 mas @${sender.split("@")[0]} recusou seu pedido💔`, mentions: [sender, namoroObject?.autor]}, {quoted: msg});
      
      //deleta dos pedidos
      await clientRedis.del(`namoro:${sender}`);
    }
  }

    
  
  //pega os dados do grupo
  const groupReply = await grupos.findOne({groupId: from});
  
  //Caso o grupo tenha a anttotag ativa
  if(from.endsWith("@g.us") && groupReply.antiTotag) {
    if(msg.key.fromMe) return;
    try {
      //pega info do grupo
      const metadata = await sock.groupMetadata(from);
      //Pega todos os ids do grupo
      const todos = metadata.participants.map(p => p.id);
      
      //Verifica se a quantidade de mencoes é maior ou igual a quantidade de membros
      if((Array.isArray(mentions) ? mentions : []).length >= todos.length) {
        await bot.reply(from, "Ei!!! Detectei uso abusivo de menções. Adeus!");
        
        await sock.groupParticipantsUpdate(from, [sender], 'remove');
        
      }
      
    }
    catch(err) {
      await bot.reply(from, erros_prontos);
      console.error(err);
    }
    
  }
  
  //caso o grupo tenha autoreply ativo
  if(groupReply && groupReply.autoReply) {
    
      //caso ouva uma mencao ou frase com a yuki
    if(bodyCase.includes("yuki")) {
            //promp base pra yuki
    const promptBase = `
SYSTEM: Você é a yuki, uma bot de whatsapp ironica, explicativa quando PRECISA, e as vezes carinhosa, seja direta e use no maximo 3 paragrafos. Voce deve responder o campo Message, e use o campo Nome somente se fizer sentido
Nome: {${msg.pushName}}
Mensagem: {${body}}
`;
        try {
          //simula escrita
          await sock.sendPresenceUpdate("composing", from);
          //separa cada palavra
          const args = body.split(" ")
          //estrutura de resposta
          const yukiGpt = await axios.get(`https://zero-two-apis.com.br/api/ia/gpt4?query=${encodeURIComponent(promptBase)}&apikey=${process.env.ZEROTWO_APIKEY}`);
          //manda a mensagem
          await sock.sendMessage(from, {text: yukiGpt.data.resultado}, {quoted: msg});
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
    
  }
    
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
    
    //Caso o users tenha o modo sem prefixo
if(!usersSender.prefixo && !body.startsWith(prefixo)) {
  
  const argsNoPrefix = body.trim().split(" ");
  
  const commandNamePrefix = argsNoPrefix.shift().toLowerCase();
  
  //Busca pelo mapa
  const commandNoPrefix = commandsMap.get(commandNamePrefix);
  
  
  
  //se nao existir
  if(!commandNoPrefix) return;
  
      //Verifica se tem spam no comando
    if(spamCommand(sender, commandNamePrefix)) {
      const respostasSpamList = [`Ei! Pare de spamar o mesmo comando!`, `Eu entendo que você gostou muito do comando mas não posso deixar você abusar.`, `Hum... Você gostou do comando né...? Porém não permito spam dele!`, `A Yuki detectou spam do mesmo comando! Pare de abusar do comando!`];
      
      const frasesSpamCommandNoPrefix = respostasSpamList[Math.floor(Math.random() * respostasSpamList.length)];
      
      await bot.reply(from, frasesSpamCommandNoPrefix);
      return
    }
  
  //Se existe executa
  messageQueue.get(grupoRemote).push(async () => {
    
            //lida com aluguel
    const isPadrao = commandNoPrefix.categoria === "padrao";
    if(!isPadrao && from.endsWith("@g.us")) {
    const grupoAluguel = await grupos.findOne({groupId: from});
    
    if(!grupoAluguel) return;
    const dataAtual = Date.now();
    
    const isDono = !!doninhos;
    
    const isVip = usersSender?.vencimentoVip && dataAtual > usersSender?.vencimentoVip?.getTime();
    
    const isAluguel = dataAtual > grupoAluguel.aluguel;
    
    if(isAluguel && !isVip) {
      await sock.sendMessage(from, {text: `Este grupo está com aluguel vencido!\n\n⤷ Use: *${prefixo}alugar*`}, {quoted: msg});
      return
    }
    }
    
  commandNoPrefix.execute(sock, msg, from, argsNoPrefix, erros_prontos, espera_pronta, bot);
  });
}
    
    //PROCESSAMENTO DE MENSAGENS
    //adiciona tudo em uma fila
    messageQueue.get(grupoRemote).push(async () => {
    //Cuidado com quem permite uso disso.
    if (body.startsWith(">")) {
  try {
    if (!numberOwner.includes(sender)) return;

    const result = await eval(body.slice(2));

    return sock.sendMessage(
      from,
      { text: require("util").inspect(result, { depth: 2 }) },
      { quoted: msg }
    );
  } catch (e) {
    return sock.sendMessage(from, { text: String(e) }, { quoted: msg });
  }
}
    //Caso um grupo tenha auto download
  const groupDonwload = await grupos.findOne({groupId: from});
  
  if(groupDonwload && groupDonwload.autoDownload || from.endsWith("@lid")) {
  //caso tenha um link de tiktok
  if (body.startsWith("https://vt.tiktok.com/")) {

    tiktokDl(sock, msg, from, body, erros_prontos, espera_pronta);

  }
  
  if(body.includes("https://open.spotify.com/track/")) {
    spotifyDl(sock, msg, from, body, erros_prontos, espera_pronta, bot)
  }
  
  if(body.startsWith("https://www.instagram.com/reel")) {
    instaDl(sock, msg, from, body, erros_prontos, espera_pronta)
  }
  
  }

  //Caso uma mensagem comece com prefixo
  if(body.startsWith("prefixo")) {
    
    if(msg.key.fromMe) return;
    
    await sock.sendMessage(from, {text: `O prefixo atual deste grupo é: \`${groupDBInfo.configs.prefixo || "/"}\``}, {quoted: msg});
  }




  let userFind = await users.findOne({userLid: sender});



//tratamento dos comandos
  if (body.startsWith(prefixo)) {
    


//pega o argumento digitado e deixa ele em letras minusculas
    const commandName = args.shift().toLowerCase();
  //procura no map
  const commandGet = commandsMap.get(commandName)

//se nao existir
    if (!commandGet) {
    
      
      
      //Cria um array de chaves pra verificar
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
      
      const ListMsgSimilarCmd = [`${prefixo}${commandName}...? Eu não entendo essa língua porém... Acho que você quis dizer *${prefixo}${similarity.sugest}* Estou certa?`, `Não faço a miníma ideia do que seja ${prefixo}${commandName}, mas... Achei um comando similar, *${prefixo}${similarity.sugest}*. Acertei?`, `Procurei esse comando em todas minhas receitas porém... Achei um parecido, ${prefixo}${similarity.sugest}, Estou certa?`, `Tentei adivinhar oque você pediu, porém não consegui. Mas achei um comando similar, *${prefixo}${similarity.sugest}*, é oque deseja?`];
      
      const similarCmdRandom = ListMsgSimilarCmd[Math.floor(Math.random() * ListMsgSimilarCmd.length)];
      
      sock.sendMessage(from, {text: `${similarCmdRandom}\n\n⤷ Similaridade: ${similarity.similarity}%`}, {quoted: msg});
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
    //Verifica se tem spam 
    if(spamCommand(sender, commandName)) {
      const respostasSpamList = [`Ei! Pare de spamar o mesmo comando!`, `Eu entendo que você gostou muito do comando mas não posso deixar você abusar.`, `Hum... Você gostou do comando né...? Porém não permito spam dele!`, `A Yuki detectou spam do mesmo comando! Pare de abusar do comando!`];
      
      const frasesSpamCommand = respostasSpamList[Math.floor(Math.random() * respostasSpamList.length)];
      
      await bot.reply(from, frasesSpamCommand);
      return
    }
    
              //lida com aluguel
    const isPadrao = commandGet.categoria === "padrao";
    if(!isPadrao && from.endsWith("@g.us") && process.env.DEV_AMBIENT === "false") {
    const grupoAluguel = await grupos.findOne({groupId: from});
    
    if(!grupoAluguel) return;
    const dataAtual = Date.now();
    
    const isDono = !!doninhos;
    
    const isVip = usersSender?.vencimentoVip && dataAtual > usersSender?.vencimentoVip?.getTime();
    
    const isAluguel = dataAtual > grupoAluguel.aluguel;
    
    if(isAluguel && isVip && !isDono) {
      //await sock.sendMessage(from, {text: `Este grupo está com aluguel vencido!\n\n⤷ Use: *${prefixo}alugar*`}, {quoted: msg});
      return
    }
    }
    
    
    //Simula escrita
    await sock.sendPresenceUpdate('composing', from);
    
    //executa o comando
    await commandGet.execute(sock, msg, from, args, erros_prontos, espera_pronta, bot);
    
    //pausa a simulacao
    await sock.sendPresenceUpdate('paused', from);
//adiciona no contador de comandos
    await rankativos.updateOne({userLid: msg.key.participant, from: from}, {$inc: {cmdUsados: 1}}, {upsert: true})
//adiciona no contador do grupo
   if(from.endsWith("@g.us")) {
   await grupos.updateOne({groupId: from}, {$inc: {cmdUsados: 1}});
     
   }
//adiciona no contador de user
   await users.updateOne({userLid: sender}, {$inc: {cmdCount: 1}});
   
  }
    });
    
    //chama a funcao que processa cada mensagem
    processMessage(grupoRemote);
    
    


  });


}