const { rankativos } = require("../../database/models/rankativos");

module.exports = {
  name: "rankativos",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      const array = await rankativos.find({from: from}).sort({msg: -1}).limit(10);
      
      const list = array.map((item, indice) => {
        return `❛❛.𔓘᷼${indice + 1} ➻ @${item.userLid.split("@")[0]}\n𝗺𝗲𝗻𝘀𝗮𝗴𝗲𝗻𝘀: ${item.msg}
\n𝗰𝗼𝗺𝗮𝗻𝗱𝗼𝘀 𝘂𝘀𝗮𝗱𝗼𝘀: ${item.cmdUsados}`
      })
      
      const mencao = array.map(i => i.userLid)
      
      
      
      await sock.sendMessage(from, {text: `┍─┈ ᩡ ִׄ  𝐑𝐚𝐧𝐤 𝐝𝐞 𝐚𝐭𝐢𝐯𝐢𝐝𝐚𝐝𝐞֢  ׄ ❅₊˚❄️⃪꫶໋ᨘ݊˙੭.
󠇈󠆢󠆠󠆟󠆞󠆜󠆛󠆚󠆙󠅤󠄀󠇈󠆢󠆠󠆟󠆞󠆜󠆛󠆚󠆙󠅤󠄀󠇈󠆢󠆠󠆟󠆞󠆜󠆛 ֵׅᰍํׅᰍ󠇈󠆢󠆠󠆟󠆞󠆜󠆛󠆚󠆙󠅤󠄀󠇈󠆢󠆠󠆟󠆞󠆜󠆛󠆚󠆙󠅤󠄀󠇈󠆢󠆠󠆟󠆞󠆜󠆛󠆚󠆙󠅤󠄀ㅤ໋ ׅㅤํ𔓕 \n\n${list.join("\n\n")}`, mentions: mencao}, {quoted: msg});
      
      
      
      
    }
    catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err)
    }
    
    
    
  }
}