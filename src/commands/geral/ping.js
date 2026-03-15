const os = require("os");
const path = require("path");
const { grupos } = require("../../database/models/grupos");
const { users } = require("../../database/models/users");


module.exports = {
  name: "ping",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
    const antes = Date.now();
    await sock.sendMessage(from, {text: "Pong!"});
    const depois = Date.now();
    
    const ping = depois - antes
    
    const processador = os.cpus()[0]
    
    const usersFind = await users.find();
    const gruposFind = await grupos.find();

const infoPing = `⚡𝗣𝗶𝗻𝗴:${ping}ms
💨𝗦𝗶𝘀𝘁𝗲𝗺𝗮 𝗼𝗽𝗲𝗿𝗮𝗰𝗶𝗼𝗻𝗮𝗹: ${os.type()}
🔥𝗣𝗿𝗼𝗰𝗲𝘀𝘀𝗮𝗱𝗼𝗿: ${processador ? processador.model : "Informação indisponível"}
⚡𝗩𝗲𝗹𝗼𝗰𝗶𝗱𝗮𝗱𝗲: ${processador ? processador.speed : "Informação indisponível"}MHz
📂𝗥𝗮𝗺: ${(os.freemem() / (1024 * 1024 * 1024)).toFixed(0)}Gb/${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(0)}Gb
🗂𝗥𝗮𝗺 𝘂𝘀𝗮𝗱𝗮: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(0)}mb
✨𝗛𝗼𝘀𝘁 ${os.hostname()}
⛓️𝗔𝗿𝗾𝘂𝗶𝘁𝗲𝘁𝘂𝗿𝗮: ${os.arch}
🔧𝗡𝗼𝗱𝗲𝗷𝘀: ${process.version}

𝗕𝗼𝘁 𝗶𝗻𝗳𝗼:

❄️𝗨𝘀𝘂𝗮́𝗿𝗶𝗼𝘀: ${usersFind.length}
🩵𝗚𝗿𝘂𝗽𝗼𝘀: ${gruposFind.length}
*Grupo:* https://chat.whatsapp.com/IbVzNXRCH2X8Oim6B4wKnP?mode=gi_t
`

await sock.sendMessage(from, {image: {url: path.join(__dirname, "../../assets/images/yuki.jpg")}, caption: infoPing}, {quoted: msg});
}
catch(err) {
  sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
  console.error(err);
}

    
  }
}