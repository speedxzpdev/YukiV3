const { buildAnalyticsText, getInfo, isTikTokUrl } = require("../../utils/tiktok.js");

module.exports = {
  name: "check",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      const url = args.join(" ").trim();

      if (!url || !isTikTokUrl(url)) {
        await sock.sendMessage(from, { text: 'Use "/check <link do TikTok>".' }, { quoted: msg });
        return;
      }

      const waitMessage = await sock.sendMessage(
        from,
        { text: espera_pronta || "Analisando esse TikTok..." },
        { quoted: msg }
      );
      const data = await getInfo(url);

      const analyticsText = buildAnalyticsText(data);

      await sock.sendMessage(from, { text: analyticsText }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: erros_prontos || "Não consegui analisar esse TikTok." }, { quoted: msg });
      console.error("Erro no comando /check:", err?.response?.data || err);
    }
  }
};
