const { exec, execSync} = require("child_process");
const fs = require("fs");


module.exports = {
  name: "play",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    
    const texto = args.slice(0).join(" ")?.trim();
      try {
    if (!texto) {
      await reply("FILHO DA PUTA BURRO DO KRL USA ESSA PORRA DIREITO SEU BOSTA")
      return
    }

    const pesquisa = encodeURIComponent(texto)
    await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});

    const infoJson = execSync(`yt-dlp -j 'ytsearch1:${texto}'`)
    const info = JSON.parse(infoJson)
    const audio = execSync(`yt-dlp -x --audio-format mp3 "https://www.youtube.com/watch?v=${info.id}" -o "../assets/temp/${info.id}.mp3"`)


    const legenda = `*Yuki Donwloads*
> informações do criador:
    *autor*: ${info.uploader}
    *url do canal*: ${info.uploader_url}
> informações do video:
    *titulo*: ${info.title}
    *curtidas*: ${info.like_count}
    *vizualizações*: ${info.view_count}
    *Data de upload*: ${info.upload_date}
    *Duração*: ${info.duration}segundos
    *comentarios*: ${info.comment_count}
    *descrição*: ${info.description}
    `
    
    await sock.sendMessage(from, { image: { url: info.thumbnail }, caption: legenda}, {quoted: msg})


    await sock.sendMessage(from, { audio: { url: `../assets/temp/${info.id}.mp3` }, mimetype: "audio/mpeg"}, { quoted: msg });

    fs.unlinkSync(`../assets/temp/${info.id}.mp3`)




  }
  catch(err) {
    await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
    console.error("Sla oq aconteceu mais bugou", err)
  }
    
  }
}