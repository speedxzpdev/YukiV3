const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

// Seu número privado (para onde as respostas do comando vão)
const OWNER_JID = "556183056421@s.whatsapp.net";

module.exports = {
  name: "vo",
  async execute(sock, msg, from, args) {
    try {
      const quoted =
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted?.viewOnceMessageV2) {
        await sock.sendMessage(
          OWNER_JID,
          { text: "❌ Não detectei uma mídia view-once na mensagem respondida." },
          { quoted: msg } // opcional: cita a mensagem original para contexto
        );
        return;
      }

      const voMessage = quoted.viewOnceMessageV2.message;

      const mediaMessage =
        voMessage.imageMessage ||
        voMessage.videoMessage;

      if (!mediaMessage) {
        await sock.sendMessage(
          OWNER_JID,
          { text: "❌ A view-once não contém imagem nem vídeo." },
          { quoted: msg }
        );
        return;
      }

      const saveDir = "C:/Users/luisf/Projects/YukiV3/view once";
      if (!fs.existsSync(saveDir)) {
        fs.mkdirSync(saveDir, { recursive: true });
      }

      const buffer = await downloadMediaMessage(
        { message: voMessage },
        "buffer",
        {}
      );

      const isImage = !!voMessage.imageMessage;
      const ext = isImage ? "jpg" : "mp4";
      const filename = `view_once_${Date.now()}.${ext}`;
      const filepath = path.join(saveDir, filename);

      fs.writeFileSync(filepath, buffer);

      await sock.sendMessage(
        OWNER_JID,
        { 
          text: `✅ View-once salva com sucesso!\n\n📁 Arquivo: ${filename}`,
        },
        { quoted: msg }
      );

      console.log("[VO] View-once salva em:", filepath);

    } catch (err) {
      console.error("[VO] ERRO:", err);

      await sock.sendMessage(
        OWNER_JID,
        {
          text:
            "❌ Erro ao salvar a view-once.\n\n" +
            "📄 LOG:\n" +
            (err?.stack || err?.message || String(err))
        },
        { quoted: msg }
      );
    }
  }
};