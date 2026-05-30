const axios = require('axios');
const Form = require('form-data');
const { downloadMediaMessage } = require('whaileys');
const crypto = require('crypto');

module.exports = {
    name: "catbox",
    async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
        try {
            const mediaMessage = msg.message?.imageMessage;

            if (!mediaMessage) {
                await bot.reply(from, "Envie uma imagem ou video junto ao comando, seu burrinho.");
                return;
            }

            if (mediaMessage.fileLength > 10 * 1024 * 1024) {
                await bot.reply(from, "Manda um arquivo mais pequeno seu pnc, o limite é 10MB.");
                return;
            }

        const msgUX = await bot.reply(from, "Convertendo para buffer...");

        const buffer = await downloadMediaMessage(msg, "buffer", {});

        await bot.editReply(from, msgUX.key, "Enviando para o catbox...");

        const form = new Form();

        form.append("reqtype", "fileupload");
        form.append("userhash", "");
        form.append("fileToUpload", buffer, {
            filename: `upload_${crypto.randomBytes(16).toString('hex')}.${mediaMessage.mimetype.split("/")[1]}`,
            contentType: mediaMessage.mimetype
        });

        const response = await axios.post("https://catbox.moe/user/api.php", form, {
    headers: {
        ...form.getHeaders(),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Origin": "https://catbox.moe",
        "Referer": "https://catbox.moe/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    }
});

        await bot.editReply(from, msgUX.key, "Upload concluído!");
            const url = response.data;

            await sock.sendMessage(from, {image: {url: url}, caption: url}, {quoted: msg});
        } catch (err) {
            console.error(err);
            await bot.reply(from, erros_prontos);
        }
    }
}