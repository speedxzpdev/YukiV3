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
┆𓏲🫧֪𝆫➺ TikTok 
┆𓏲🫧֪𝆫➺  Instagram
╰┈┈┈┈ ┄╸ʚ❅ɞ╺┈ ┈┈┈┈╯
╭┄➤🔎 𝐏𝐞𝐬𝐪𝐮𝐢𝐬𝐚𝐬:
┆𓏲🫧֪𝆫➺ Play
┆𓏲🫧֪𝆫➺ Pin
┆𓏲🫧֪𝆫➺ Pinvideo
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
╰┈┈┈┈ ┄╸ʚ❅ɞ╺┈ ┈┈┈┈╯`
  
  
  
}




  
  
}

module.exports = menu