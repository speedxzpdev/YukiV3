const {
  buildAddrListText,
  getInfo,
  handleAddrDownloadChoice,
  isTikTokUrl,
  sendAddrDeliveryOptions
} = require("../../utils/tiktok.js");
const { prefixo } = require("../../config.js");

const DELIVERY_ALIASES = new Map([
  ["doc", "document"],
  ["document", "document"],
  ["documento", "document"],
  ["video", "video"],
  ["vídeo", "video"]
]);

function parseAddrIndex(value) {
  const index = Number.parseInt(String(value || "").replace("#", ""), 10);
  return Number.isFinite(index) && index > 0 ? index : null;
}

module.exports = {
  name: "download_addr",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const index = parseAddrIndex(args[0]);

      if (index) {
        const delivery = DELIVERY_ALIASES.get(String(args[1] || "").toLowerCase());
        const urlStart = delivery ? 2 : 1;
        const url = args.slice(urlStart).join(" ").trim();

        if (!url || !isTikTokUrl(url)) {
          await sock.sendMessage(from, { text: 'Use "/download_addr <número> doc <link do TikTok>".' }, { quoted: msg });
          return;
        }

        if (!delivery) {
          await sendAddrDeliveryOptions(sock, msg, from, url, index, prefixo || "/");
          return;
        }

        await sock.sendMessage(from, { text: espera_pronta || `Preparando o addr ${index}...` }, { quoted: msg });
        await handleAddrDownloadChoice(sock, msg, from, url, index, sender, delivery);
        return;
      }

      const url = args.join(" ").trim();
      if (!url || !isTikTokUrl(url)) {
        await sock.sendMessage(from, { text: 'Use "/download_addr <link do TikTok>".' }, { quoted: msg });
        return;
      }

      await sock.sendMessage(from, { text: espera_pronta || "Buscando todos os addrs desse TikTok..." }, { quoted: msg });
      const data = await getInfo(url);
      await sock.sendMessage(
        from,
        { text: buildAddrListText(data, url, prefixo || "/") },
        { quoted: msg }
      );
    } catch (err) {
      await sock.sendMessage(from, { text: erros_prontos || "Não consegui trabalhar com os addrs desse TikTok." }, { quoted: msg });
      const errorInfo = err?.response ? `${err.response.status} ${err.response.statusText || ""}`.trim() : err?.message || err;
      console.error("Erro no comando /download_addr:", errorInfo);
    }
  }
};
