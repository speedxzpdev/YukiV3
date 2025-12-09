const {prefixo, numberBot, numberOwner, botName, version } = require("../config");
const { grupos } = require("../database/models/grupos");

const os = require("os");

function menu(msg) {
  
  const agora = new Date();
  
  const groups = grupos.find();
  
  const semanas = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
  return `Olá, ${msg.pushName || "Sem nome"}
𝗕𝗼𝘁: ${botName}
𝗣𝗿𝗲𝗳𝗶𝘅𝗼: ${prefixo}
𝗩𝗲𝗿𝘀ã𝗼: ${version}
𝗗𝗮𝘁𝗮: ${semanas[agora.getDay()]}, ${agora.getDate()} De ${meses[agora.getMonth()]}
𝗛𝗼𝗿𝗮: ${agora.toLocaleTimeString("pt-BR")}
𝗛𝗼𝘀𝘁: ${os.hostname()}

𝗣𝗮𝗶𝗻𝗲𝗹 𝗱𝗲 𝗺𝗲𝗻𝘂



𝗙𝗶𝗴𝘂𝗿𝗶𝗻𝗵𝗮𝘀 𝗲 𝗰𝗼𝗻𝘃𝗲𝗿𝘀𝗼𝗿𝗲𝘀
${prefixo}s - Crie uma figurinha
${prefixo}toimage - Figurinha em imagem

𝙄𝙣𝙩𝙚𝙡𝙞𝙜ê𝙣𝙘𝙞𝙖 𝙖𝙧𝙩𝙞𝙛𝙞𝙘𝙖𝙡
${prefixo}chatgpt - Chat ia
${prefixo}animagine - Geração de imagem

𝙎𝙩𝙖𝙡𝙠𝙚𝙧𝙨
${prefixo}tiktokstalk - Informações sobre o perfil

𝗘𝗰𝗼𝗻𝗼𝗺𝗶𝗮(𝗗𝗲𝘃)
${prefixo}saldo


`
  
  
}

module.exports = menu