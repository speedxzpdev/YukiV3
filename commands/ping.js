const os = require("os");


module.exports = {
  name: "ping",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
    const antes = Date.now();
    await sock.sendMessage(from, {text: "Pong!"});
    const depois = Date.now();
    
    const ping = depois - antes
    
    const processador = os.cpus()[0]


const infoPing = `⚡𝐏𝐢𝐧𝐠: ${ping}ms
💨𝐒𝐢𝐬𝐭𝐞𝐦𝐚 𝐨𝐩𝐞𝐫𝐚𝐜𝐢𝐨𝐧𝐚𝐥: ${os.type()}
🔥𝐏𝐫𝐨𝐜𝐞𝐬𝐚𝐝𝐨𝐫: ${processador ? processador.model : "Informação indisponível"}
⚡𝐕𝐞𝐥𝐨𝐜𝐢𝐝𝐚𝐝𝐞: ${processador ? processador.speed : "Informação indisponível"}MHz
📂𝐑𝐚𝐦: ${(os.freemem() / (1024 * 1024 * 1024)).toFixed(0)}Gb/${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(0)}Gb
🗂𝐑𝐚𝐦 𝐮𝐬𝐚𝐝𝐚: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(0)}mb
✨𝐇𝐨𝐬𝐭: ${os.hostname()}
⛓️𝐀𝐫𝐪𝐮𝐢𝐭𝐞𝐭𝐮𝐫𝐚: ${os.arch}
🔧𝐍𝐨𝐝𝐞𝐣𝐬: ${process.version}

𝐛𝐨𝐭 𝐈𝐧𝐟𝐨:

❄️𝐔𝐬𝐮á𝐫𝐢𝐨𝐬 𝐫𝐞𝐠𝐢𝐬𝐭𝐫𝐚𝐝𝐨𝐬: 
🌨️𝐂𝐨𝐦𝐚𝐧𝐝𝐨𝐬:
🧊𝐃𝐢𝐚𝐬 𝐫𝐞𝐬𝐭𝐚𝐧𝐭𝐞𝐬: `

await sock.sendMessage(from, {image: {url: "https://files.catbox.moe/x8zn40.jpg"}, caption: infoPing}, {quoted: msg});
}
catch(err) {
  sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
  console.error(err);
}

    
  }
}