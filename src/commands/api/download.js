const {
  handleDownloadChoice,
  isTikTokUrl,
  sendDownloadOptions
} = require("../../utils/tiktok.js");
const { prefixo } = require("../../config.js");

const VALID_OPTIONS = new Set(["normal", "original", "audio"]);

module.exports = {
  name: "download",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const first = String(args[0] || "").toLowerCase();
      const option = VALID_OPTIONS.has(first) ? first : null;
      const url = option ? args.slice(1).join(" ").trim() : args.join(" ").trim();

      if (!url || !isTikTokUrl(url)) {
        await sock.sendMessage(from, { text: 'Use "/download <link do TikTok>".' }, { quoted: msg });
        return;
      }

      if (!option) {
        await sendDownloadOptions(sock, msg, from, url, prefixo || "/");
        return;
      }

      await sock.sendMessage(from, { text: espera_pronta || "Preparando o arquivo..." }, { quoted: msg });
      await handleDownloadChoice(sock, msg, from, url, option, sender);
    } catch (err) {
      await sock.sendMessage(from, { text: erros_prontos || "Não consegui baixar esse TikTok." }, { quoted: msg });
      console.error("Erro no comando /download:", err?.response?.data || err);
    }
  }
};
