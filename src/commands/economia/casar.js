const { namoros } = require("../../database/models/namoros");
const { users } = require("../../database/models/users");
const { numberBot } = require("../../config");


module.exports = {
 name: "namorar",
 async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
   try {
     
     const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant
     
     const sender = msg.key.participant
     
     if(!mention) {
       await sock.sendMessage(from, {text: "Menciona alguém, seu jumento(a) inseguro!"}, {quoted: msg});
       return
     }
     
     if(mention.includes(numberBot)) {
       await sock.sendMessage(from, {text: "Eii! Eu sou apenas uma bot!"}, {quoted: msg});
       return
     }
     
     let userSender = await users.findOne({userLid: sender});
     
     let userMention = await users.findOne({userLid: mention});
     
     if(!userSender) {
       await users.create({userLid: sender});
       
       userSender = await users.findOne({userLid: sender});
     }
     
     if(!userMention) {
       await users.create({userLid: mention});
       
       userSender = await users.findOne({userLid: mention});
     }
     
     if(userSender.casal.parceiro) {
       await sock.sendMessage(from, {text: `Hum... Estou sentindo um pouco de traição da sua parte viu...`}, {quoted: msg});
       return
     }
     
     if(userMention.casal.parceiro) {
       await sock.sendMessage(from, {text: "Ei!!! Essa pessoa já está em um relacionamento. Sinto informar..."}, {quoted: msg});
       return
     }
     
     if(await namoros.findOne({alvo: mention})) {
       await sock.sendMessage(from, {text: "Este usuário já possui um pedido pendente!"}, {quoted: msg});
       return
     }
     
     if(await namoros.findOne({pedidor: sender})) {
       await sock.sendMessage(from, {text: "Você já possui um pedido pendente!"}, {quoted: msg});
       return
     }
     
     await namoros.create({alvo: mention, pedidor: sender});
     
     await sock.sendMessage(from, {text: `O(a) @${mention.split("@")[0]} acaba de ser pedida em namoro por @${sender.split("@")[0]}💕\nResponda essa mensagem com: Aceitar ou Recusar`, mentions: [mention, sender]}, {quoted: msg});
    
   }
   catch(err) {
     await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
     console.error(err);
   }
   
 }
}