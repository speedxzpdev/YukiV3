const {prefixo, numberBot, numberOwner, botName, version } = require("../config");
const os = require("os");


function menu(msg) {
  
  const agora = new Date();
  
  const semanas = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
  const subMenu = `Olá, ${msg.pushName || "Sem nome"}
𝗕𝗼𝘁: ${botName}
𝗣𝗿𝗲𝗳𝗶𝘅𝗼: ${prefixo}
𝗩𝗲𝗿𝘀ã𝗼: ${version}
𝗗𝗮𝘁𝗮: ${semanas[agora.getDay()]}, ${agora.getDate()} De ${meses[agora.getMonth()]}
𝗛𝗼𝗿𝗮: ${agora.toLocaleTimeString("pt-BR")}
𝗛𝗼𝘀𝘁: ${os.hostname()}
`

return {
  
  menuPrincipal: `${subMenu}
  
𝗣𝗮𝗶𝗻𝗲𝗹 𝗱𝗲 𝗺𝗲𝗻𝘂
${prefixo}menuadmin - Veja comandos de admin!
${prefixo}menudownloads

𝗙𝗶𝗴𝘂𝗿𝗶𝗻𝗵𝗮𝘀 𝗲 𝗰𝗼𝗻𝘃𝗲𝗿𝘀𝗼𝗿𝗲𝘀
${prefixo}s - Crie uma figurinha
${prefixo}toimg - Figurinha em imagem

𝙄𝙣𝙩𝙚𝙡𝙞𝙜ê𝙣𝙘𝙞𝙖 𝙖𝙧𝙩𝙞𝙛𝙞𝙘𝙖𝙡
${prefixo}chatgpt - Chat ia
${prefixo}animagine - Geração de imagem
${prefixo}tradutor - Traduz algo

𝙎𝙩𝙖𝙡𝙠𝙚𝙧𝙨
${prefixo}tiktokstalk - Informações sobre o perfil

𝗘𝗰𝗼𝗻𝗼𝗺𝗶𝗮(𝗗𝗲𝘃)
${prefixo}perfil
${prefixo}mudarbio
${prefixo}saldo

`,

menuAdmin: `${subMenu}

𝗔𝗱𝗺𝗶𝗻𝗶𝘀𝘁𝗿𝗮𝗰̧𝗮̃𝗼 𝗲 𝗺𝗼𝗱𝗲𝗿𝗮𝗰̧𝗮̃𝗼
${prefixo}ban - remove um membro do grupo.
${prefixo}add - adiciona alguém ao grupo
${prefixo}promover - promove um membro a admin
${prefixo}rebaixar - Remove o admin de um membro
${prefixo}grupo - libera ou desativa mensagens
${prefixo}totag - marca todos do grupo
${prefixo}d - deleta uma mensagem
${prefixo}mute - muta um determinado membro
${prefixo}desmute - remove o mute
${prefixo}adv - adiciona uma advertência a um usuário
${prefixo}removeradv - remove uma advertência


𝗜𝗻𝗳𝗼𝗿𝗺𝗮𝗰̧𝗮̃𝗼 𝗲 𝗰𝗼𝗻𝗳𝗶𝗴𝘂𝗿𝗮𝗰̧𝗮̃𝗼
${prefixo}grupoinfo - exibe informações do grupo.
${prefixo}autoreply - ativa ou desativa auto respostas.
${prefixo}welcome - desativa ou ativa o boas vindas.
`,

menuDownloads: `${subMenu}

𝗧𝗶𝗸𝘁𝗼𝗸 𝗲 𝗶𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺

${prefixo}tiktok - baixa videos do tiktok!
${prefixo}instagram - baixa videos do instagram!

𝗽𝗲𝘀𝗾𝘂𝗶𝘀𝗮𝘀
${prefixo}play - busca por um audio no youtube!
${prefixo}pin - busca por uma foto no pinterest
${prefixo}pinvideo - busca por um video no pinterest
`


  
  
  
}




  
  
}

module.exports = menu