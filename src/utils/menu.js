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
ʔ  ׄ    ᩿   ׅ
╭┈⊰ ❅ 𝐌𝐄𝐍𝐔 𝐀𝐃𝐌𝐈𝐍

╭┄➤🛡️𝐀𝐝𝐦𝐢𝐧𝐢𝐬𝐭𝐫𝐚𝐜̧𝐚̃𝐨 𝐞 𝐦𝐨𝐝𝐞𝐫𝐚𝐜̧𝐚̃𝐨:
┆𓏲🫧֪𝆫➺ ${prefixo}ban
┆𓏲🫧֪𝆫➺ ${prefixo}add
┆𓏲🫧֪𝆫➺ ${prefixo}promover
┆𓏲🫧֪𝆫➺ ${prefixo}rebaixar
┆𓏲🫧֪𝆫➺ ${prefixo}grupo
┆𓏲🫧֪𝆫➺ ${prefixo}totag
┆𓏲🫧֪𝆫➺ ${prefixo}d
┆𓏲🫧֪𝆫➺ ${prefixo}mute
┆𓏲🫧֪𝆫➺ ${prefixo}desmute
┆𓏲🫧֪𝆫➺ ${prefixo}adv
┆𓏲🫧֪𝆫➺ ${prefixo}rmadv
┆𓏲🫧֪𝆫➺ ${prefixo}roletarussa
╰┈┈┈┈ ┄╸ʚ❅ɞ╺┈ ┈┈┈┈╯
╭┄➤⚙️ 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐜̧𝐨̃𝐞𝐬 𝐞 𝐜𝐨𝐧𝐟𝐢𝐠𝐮𝐫𝐚𝐜̧𝐨̃𝐞𝐬:
┆𓏲🫧֪𝆫➺ ${prefixo}grupoinfo
┆𓏲🫧֪𝆫➺ ${prefixo}autoreply
┆𓏲🫧֪𝆫➺ ${prefixo}welcome
┆𓏲🫧֪𝆫➺ ${prefixo}modobrincadeira
╰┈┈┈┈ ┄╸ʚ❅ɞ╺┈ ┈┈┈┈╯
`,

menuDownloads: `${subMenu}
  ׄ    ᩿   ׅ
╭┈⊰ ❅ 𝐌𝐄𝐍𝐔 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃

╭┄➤📱 𝐓𝐢𝐤𝐓𝐨𝐤 𝐞 𝐈𝐧𝐬𝐭𝐚𝐠𝐫𝐚𝐦:
┆𓏲🫧֪𝆫➺${prefixo}TikTok 
┆𓏲🫧֪𝆫➺ ${prefixo}Instagram
╰┈┈┈┈ ┄╸ʚ❅ɞ╺┈ ┈┈┈┈╯
╭┄➤🔎 𝐏𝐞𝐬𝐪𝐮𝐢𝐬𝐚𝐬:
┆𓏲🫧֪𝆫➺ ${prefixo}Play
┆𓏲🫧֪𝆫➺ ${prefixo}Pin
┆𓏲🫧֪𝆫➺ ${prefixo}Pinvideo
┆𓏲🫧֪𝆫➺ ${prefixo}tiktoksearch

╰┈┈┈┈ ┄╸ʚ❅ɞ╺┈ ┈┈┈┈╯
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
╰┈┈┈┈ ┄╸ʚ❅ɞ╺┈ ┈┈┈┈╯`,


menuDono: `${subMenu}
ׄ    ᩿   ׅ
╭┈⊰ ❅ 𝐌𝐄𝐍𝐔 𝐃𝐎𝐍𝐎

╭┄➤👑 𝐅𝐮𝐧𝐜̧𝐨̃𝐞𝐬 𝐝𝐞 𝐃𝐨𝐧𝐨
┆𓏲🫧֪𝆫➺ ${prefixo}addgroup
┆𓏲🫧֪𝆫➺ ${prefixo}seradmin
┆𓏲🫧֪𝆫➺ ${prefixo}getfile
┆𓏲🫧֪𝆫➺ ${prefixo}aqv
┆𓏲🫧֪𝆫➺ ${prefixo}reset
┆𓏲🫧֪𝆫➺ ${prefixo}alugar
┆𓏲🫧֪𝆫➺ ${prefixo}listargrupos
┆𓏲🫧֪𝆫➺ ${prefixo}addvip

╰┈┈┈┈ ┄╸ʚ❅ɞ╺┈ ┈┈┈┈╯`,

menuCompleto: `${subMenu}
╭┉⊰✾ 𝑷𝑨𝑰𝑵𝑬𝑳 𝑫𝑬 𝑪𝑶𝑴𝑨𝑵𝑫𝑶𝑺 ʸᵘᵏᶦ

✿𝆬𓏲ַ♥︎֪𝆫១${prefixo}𝙢𝙚𝙣𝙪𝙞𝙖 ➻ inteligências artificiais
✿𝆬𓏲ַ♥︎֪𝆫១ ${prefixo}𝙢𝙚𝙣𝙪𝙙𝙤𝙬𝙣𝙡𝙤𝙖𝙙 ➻ variações de download
✿𝆬𓏲ַ♥︎֪𝆫១ ${prefixo}𝙢𝙚𝙣𝙪𝙖𝙙𝙢𝙞𝙣 ➻ veja comandos de admin
✿𝆬𓏲ַ♥︎֪𝆫១ ${prefixo}𝙢𝙚𝙣𝙪𝙗𝙧𝙞𝙣𝙘𝙖𝙙𝙚𝙞𝙧𝙖𝙨 ➻ brincadeiras e interações
✿𝆬𓏲ַ♥︎֪𝆫១ ${prefixo}𝙢𝙚𝙣𝙪𝙙𝙤𝙣𝙤 ➻ comandos exclusivos de dono
─────── ─ ─ 𖹭   ׅ ʕ•⁠ᴥ⁠•⁠ʔ  ׄ    ᩿   ׅ

🤖⃞ ➻ 𝑴𝒆𝒏𝒖 𝑰𝑨 ֹ ❈ ᜒ︵᷼ ⊹
${prefixo}𝗰𝗵𝗮𝘁𝗴𝗽𝘁 ➺ Chat IA
${prefixo}𝗮𝗻𝗶𝗺𝗮𝗴𝗶𝗻𝗲 ➺ Geração de imagens
${prefixo}𝘁𝗿𝗮𝗱𝘂𝘁𝗼𝗿 ➺ Traduz algo
${prefixo}𝗴𝗲𝗺𝗶𝗻𝗶 ➺ Assistente de IA
${prefixo}𝗴𝗲𝗺𝗶𝗻𝗶𝗽𝗲𝘀𝗾𝘂𝗶𝘀𝗮 ➺ Respostas precisas
ㅤ        ㅤ        ࿙࿚࿙࿚ ❈ ࿙࿚࿙࿚
📥⃞ ➻ 𝑴𝒆𝒏𝒖 𝑫𝒐𝒘𝒏𝒍𝒐𝒂𝒅  ֹ ❈ ᜒ︵᷼ ⊹
${prefixo}𝙩𝙞𝙠𝙩𝙤𝙠 ➺ baixa vídeos do TikTok
${prefixo}𝙞𝙣𝙨𝙩𝙖𝙜𝙧𝙖𝙢 ➺ baixa vídeos do Instagram
${prefixo}𝙥𝙡𝙖𝙮 ➺ busca por um áudio no YouTube
${prefixo}𝙥𝙞𝙣 ➺ busca por uma foto no Pinterest
${prefixo}𝙥𝙞𝙣𝙫𝙞𝙙𝙚𝙤 ➺ busca por um vídeo no Pinterest
ㅤ        ㅤ        ࿙࿚࿙࿚ ❈ ࿙࿚࿙࿚
🛡️⃞ ➻ 𝑴𝒆𝒏𝒖 𝑨𝑫𝑴 ֹ ❈ ᜒ︵᷼ ⊹
${prefixo}𝙗𝙖𝙣 ➺ remove um membro do grupo.
${prefixo}𝙖𝙙𝙙 ➺ adiciona alguém ao grupo
${prefixo}𝙥𝙧𝙤𝙢𝙤𝙫𝙚𝙧 ➺ promove um membro a admin
${prefixo}𝙧𝙚𝙗𝙖𝙞𝙭𝙖𝙧 ➺ Remove o admin de um membro
${prefixo}𝙜𝙧𝙪𝙥𝙤 ➺ libera ou desativa mensagens
${prefixo}𝙩𝙤𝙩𝙖𝙜 ➺ marca todos do grupo
${prefixo}𝙙 ➺ deleta uma mensagem
${prefixo}𝙢𝙪𝙩𝙚 ➺ muta um determinado membro
${prefixo}𝙙𝙚𝙨𝙢𝙪𝙩𝙚 ➺ remove o mute
${prefixo}𝙖𝙙𝙫 ➺ adiciona uma advertência a um usuário
${prefixo}𝙧𝙢𝙖𝙙𝙫 ➺ remove uma advertência
${prefixo}𝙧𝙤𝙡𝙚𝙩𝙖𝙧𝙪𝙨𝙨𝙖 ➺ Bane alguem aleatorio
${prefixo}𝙜𝙧𝙪𝙥𝙤𝙞𝙣𝙛𝙤 ➺ exibe informações do grupo.
${prefixo}𝙖𝙪𝙩𝙤𝙧𝙚𝙥𝙡𝙮 ➺ ativa ou desativa auto respostas.
${prefixo}𝙬𝙚𝙡𝙘𝙤𝙢𝙚 ➺ desativa ou ativa o boas vindas.
${prefixo}𝙢𝙤𝙙𝙤𝙗𝙧𝙞𝙣𝙘𝙖𝙙𝙚𝙞𝙧𝙖 ➺ ativa ou desativa comandos de diversão.
ㅤ        ㅤ        ࿙࿚࿙࿚ ❈ ࿙࿚࿙࿚
🎮⃞ ➻ 𝑴𝒆𝒏𝒖 𝑩𝒓𝒊𝒏𝒄𝒂𝒅𝒆𝒊𝒓𝒂𝒔 ֹ ❈ ᜒ︵᷼ ⊹
${prefixo}𝙗𝙚𝙞𝙟𝙖𝙧 ➺ Mencione alguém para beijar
${prefixo}𝙘𝙤𝙢𝙚𝙧 ➺ Mencione alguém para comer
${prefixo}𝙢𝙤𝙡𝙚𝙨𝙩𝙖𝙧 ➺ mencione alguém para molestar
${prefixo}𝙩𝙖𝙥𝙖 ➺ mencione alguém para executar o tapa
${prefixo}𝙜𝙖𝙮 ➺ sua porcentagem de gay
${prefixo}𝙜𝙤𝙨𝙩𝙤𝙨𝙤 ➺ sua porcentagem de gostoso
${prefixo}𝙜𝙤𝙨𝙩𝙤𝙨𝙖 ➺ sua porcentagem de gostosa
${prefixo}𝙨𝙝𝙞𝙣𝙞𝙜𝙖𝙢𝙞 ➺ veja qual é o seu shinigami
${prefixo}𝙘𝙖𝙨𝙖𝙡 ➺ shipps aleatórios do grupo
${prefixo}𝙧𝙖𝙣𝙙𝙤𝙢𝙬𝙖𝙞𝙛𝙪 ➺ veja qual a sua Waifu aleatória
           ࿙࿚࿙࿚ ❈ ࿙࿚࿙࿚
🎮⃞ ➻ 𝐌𝐞𝐧𝐮 𝐟𝐢𝐠𝐮𝐫𝐢𝐧𝐡𝐚𝐬 ❈ ᜒ︵᷼ ⊹
${prefixo}𝘀 ➺  Faça uma figurinha
${prefixo}𝗿𝗲𝗻𝗮𝗺𝗲 ➺  renomeie uma figurinha
${prefixo}𝗿𝗮𝗻𝗱𝗼𝗺𝗳𝗶𝗴 ➺ figurinha aleatórias
`
  
  
  
}




  
  
}

module.exports = menu