const { downloadMediaMessage } = require("@whiskeysockets/baileys")
const { exec, execSync } = require("child_process")
const fs = require('fs')

module.exports = {
name: "toimg",
async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
  try {
  const msg_context = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
  const msg_convert = msg_context?.stickerMessage
  
  if (!msg_convert) {
    await sock.sendMessage(from, {text: "Burro Do krai responde uma fig"}, {quoted: msg})
    return
  }
  
  await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg})
  
  const inputbuffer = await downloadMediaMessage({message: msg_context}, 'buffer', {})
  
  fs.writeFileSync('../assets/temp/toimageI.webm', inputbuffer)
  
  const output = execSync(`ffmpeg -i ../assets/temp/toimageI.webm ../assets/temp/convertfig.png`)
  
  await sock.sendMessage(from, {image: {url: "../assets/temp/convertfig.png" }, caption: ""})
  
  
  fs.unlinkSync('../assets/temp/toimageI.webm')
  fs.unlinkSync("../assets/temp/convertfig.png")

  
  }
  catch(err) {
    await sock.sendMessage(from, { text: erros_prontos }, {quoted: msg})
    console.error(err)
  }
  
  
}

  
}
