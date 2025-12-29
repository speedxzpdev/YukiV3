const {prefixo, numberBot, numberOwner, botName, version } = require("../config");
const os = require("os");


function menu(msg) {
  
  const agora = new Date();
  
  const semanas = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  
  const subMenu = `┏╾   ፝  ✦  ❄️ ᩡ  ⠞   𝓜𝓮𝓷𝓾 𝓟𝓻𝓲𝓷𝓬𝓲𝓹𝓪𝓵‍᪶  ⭒
╏ 𝘉𝘦𝘮-𝘷𝘪𝘯𝘥𝘰 (𝘢) ${msg.pushName || "Sem nome"}
   ׁ   ⏝꒡𝆺𝅥᠀݃
⏤͟͟͞͞❈𝐁𝐨𝐭: ${botName}
⏤͟͟͞͞❈𝐏𝐫𝐞𝐟𝐢𝐱𝐨: ${prefixo}
⏤͟͟͞͞❈𝐕𝐞𝐫𝐬𝐚̃𝐨: ${version}
⏤͟͟͞͞❈𝐃𝐚𝐭𝐚: ${semanas[agora.getDay()]}, ${agora.getDate()} De ${meses[agora.getMonth()]}
⏤͟͟͞͞❈𝐇𝐨𝐫𝐚: ${agora.toLocaleTimeString("pt-BR")}
⏤͟͟͞͞❈𝐇𝐨𝐬𝐭: ${os.hostname()}
╰─────── ─ ─ 𖹭   ׅ ʕ•⁠ᴥ⁠•⁠ʔ  ׄ    ᩿   ׅ
`

return {
  
  menuPrincipal: `${subMenu}
╭┈⊰ ❅ 𝐌𝐄𝐍𝐔 𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋
┆𓏲🫧֪𝆫➺ ${prefixo}menuia
┆𓏲🫧֪𝆫➺ ${prefixo}menudownloads
┆𓏲🫧֪𝆫➺ ${prefixo}menuadmin
┆𓏲🫧֪𝆫➺ ${prefixo}menubrincadeira
┆𓏲🫧֪𝆫➺ ${prefixo}menudono
╰┈┈┈┈ ┄╸ʚ❅ɞ╺┈ ┈┈┈┈╯
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
${prefixo}rmadv - remove uma advertência
${prefixo}roletarussa - Bane alguem aleatorio


𝗜𝗻𝗳𝗼𝗿𝗺𝗮𝗰̧𝗮̃𝗼 𝗲 𝗰𝗼𝗻𝗳𝗶𝗴𝘂𝗿𝗮𝗰̧𝗮̃𝗼
${prefixo}grupoinfo - exibe informações do grupo.
${prefixo}autoreply - ativa ou desativa auto respostas.
${prefixo}welcome - desativa ou ativa o boas vindas.
${prefixo}modobrincadeira - ativa ou desativa comandos de diversão.
`,

menuDownloads: `${subMenu}

𝗧𝗶𝗸𝘁𝗼𝗸 𝗲 𝗶𝗻𝘀𝘁𝗮𝗴𝗿𝗮𝗺

${prefixo}tiktok - baixa videos do tiktok!
${prefixo}instagram - baixa videos do instagram!

𝗽𝗲𝘀𝗾𝘂𝗶𝘀𝗮𝘀
${prefixo}play - busca por um audio no youtube!
${prefixo}pin - busca por uma foto no pinterest
${prefixo}pinvideo - busca por um video no pinterest
`,

menuBrincadeira: `${subMenu}

𝗿𝗼𝗹𝗲𝗽𝗹𝗮𝘆
${prefixo}beijar
${prefixo}comer
${prefixo}molestar
${prefixo}tapa
𝗔𝗹𝗲𝗮𝘁𝗼𝗿𝗶𝗲𝗱𝗮𝗱𝗲
${prefixo}gay 
${prefixo}gostoso
${prefixo}gostosa
${prefixo}shinigami
${prefixo}casal
${prefixo}randomwaifu
`,

menuAI: `${subMenu}

╭┈⊰ ❅ 𝐌𝐄𝐍𝐔 𝐈𝐀
┆𓏲🫧֪𝆫➺${prefixo}chatgpt
┆𓏲🫧֪𝆫➺ ${prefixo}animagine
┆𓏲🫧֪𝆫➺ ${prefixo}tradutor
┆𓏲🫧֪𝆫➺ ${prefixo}gemini
┆𓏲🫧֪𝆫➺ ${prefixo}geminipesquisa
╰┈┈┈┈ ┄╸ʚ❅ɞ╺┈ ┈┈┈┈╯`
  
  
  
}




  
  
}

module.exports = menu