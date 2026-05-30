const { downloadMediaMessage } = require("whaileys");
const { ensureGroup, getGroupPermission } = require("../../utils/dbHelpers");

module.exports = {
  name: "totag",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    const texto = args.slice(0).join(" ")?.trim();
    const { metadata, allowed } = await getGroupPermission(sock, from, sender);

    const button = [
      {buttonId: `${process.env.PREFIXO}afkmode 1`, buttonText: {displayText: "😴Silenciar"}, type: 1}
    ];

    if (!allowed) {
      await bot.sendNoAdmin(from);
      return;
    }

    const seloTotag = {
      key: {
        remoteJid: from,
        id: "yuki123",
        fromMe: false,
        participant: msg.key.participant
      },
      message: {
        extendedTextMessage: {text: `⤷ ❄️ Marcação do admin: ${msg.pushName}`}
      }
    };

    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const msg_quoted = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.documentMessage?.caption || texto;
    const foto = quoted?.imageMessage;
    const video = quoted?.videoMessage;
    const sticker = quoted?.stickerMessage;

    const grupo = await ensureGroup(from, metadata);
    const afkList = grupo?.afkList ?? [];
    const todos = metadata.participants.map(p => p.id).filter(p => !afkList.includes(p));

    if (foto) {
      const imgDl = await downloadMediaMessage({message: {imageMessage: foto}}, "buffer", {});
      await sock.sendMessage(from, { image: imgDl, caption: foto.caption, mentions: todos, footer: "• Caso não queira ser marcado use: */afkmode 1*", buttons: button}, { quoted: seloTotag });
      return;
    }

    if (video) {
      const videoDl = await downloadMediaMessage({message: {videoMessage: video}}, "buffer", {});
      await sock.sendMessage(from, { video: videoDl, caption: video.caption, mentions: todos, footer: "• Caso não queira ser marcado use: */afkmode 1*", buttons: button}, { quoted: seloTotag });
      return;
    }

    if (sticker) {
      const stickerDl = await downloadMediaMessage({message: {stickerMessage: sticker}}, "buffer", {});
      await sock.sendMessage(from, { sticker: stickerDl, mentions: todos}, { quoted: seloTotag });
      return;
    }

    if (msg_quoted) {
      await sock.sendMessage(from, { text: msg_quoted, mentions: todos, footer: "• Caso não queira ser marcado use: */afkmode 1*", buttons: button}, { quoted: seloTotag});
      return;
    }

    if (!msg_quoted) {
      await sock.sendMessage(from, { text: texto, mentions: todos, footer: "• Caso não queira ser marcado use: */afkmode 1*", buttons: button}, { quoted: seloTotag });
      return;
    }

    await sock.sendMessage(from, {text: "Responda uma mensagem ou digite algo!"}, {quoted: msg});
  }
};
