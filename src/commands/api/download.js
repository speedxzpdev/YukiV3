const {
  handleDownloadChoice,
  isTikTokUrl,
  sendDownloadDeliveryOptions,
  sendDownloadOptions
} = require("../../utils/tiktok.js");
const { prefixo } = require("../../config.js");

const VALID_OPTIONS = new Set(["normal", "original", "audio"]);
const DELIVERY_ALIASES = new Map([
  ["doc", "document"],
  ["document", "document"],
  ["documento", "document"],
  ["video", "video"],
  ["vídeo", "video"]
]);

module.exports = {
  name: "download",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const first = String(args[0] || "").toLowerCase();
      const option = VALID_OPTIONS.has(first) ? first : null;
      const delivery = option ? DELIVERY_ALIASES.get(String(args[1] || "").toLowerCase()) : null;
      const urlStart = option ? (delivery ? 2 : 1) : 0;
      const url = args.slice(urlStart).join(" ").trim();

      if (!url || !isTikTokUrl(url)) {
        await sock.sendMessage(from, { text: 'Use "/download <link do TikTok>".' }, { quoted: msg });
        return;
      }

      if (!option) {
        await sendDownloadOptions(sock, msg, from, url, prefixo || "/");
        return;
      }

      if (option !== "audio" && !delivery) {
        await sendDownloadDeliveryOptions(sock, msg, from, url, option, prefixo || "/");
        return;
      }

      await sock.sendMessage(from, { text: espera_pronta || "Preparando o arquivo..." }, { quoted: msg });
      await handleDownloadChoice(sock, msg, from, url, option, sender, delivery || "document");
    } catch (err) {
      await sock.sendMessage(from, { text: erros_prontos || "Não consegui baixar esse TikTok." }, { quoted: msg });
      const errorInfo = err?.response ? `${err.response.status} ${err.response.statusText || ""}`.trim() : err?.message || err;
      console.error("Erro no comando /download:", errorInfo);
    }
  }
};
