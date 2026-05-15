const {
  buildAnalyticsDetailText,
  buildAnalyticsSummaryText,
  getInfo,
  isTikTokUrl
} = require("../../utils/tiktok.js");
const { prefixo } = require("../../config.js");

const DETAIL_OPTIONS = new Set(["detail", "details", "detailed", "detalhado"]);
const SUMMARY_OPTIONS = new Set(["summary", "resumo"]);

module.exports = {
  name: "check",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      const first = String(args[0] || "").toLowerCase();
      const mode = DETAIL_OPTIONS.has(first) ? "detailed" : "summary";
      const cleanArgs = DETAIL_OPTIONS.has(first) || SUMMARY_OPTIONS.has(first) ? args.slice(1) : args;
      const url = cleanArgs.join(" ").trim();

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

      const analyticsText = mode === "detailed"
        ? buildAnalyticsDetailText(data)
        : buildAnalyticsSummaryText(data);
      const buttons = mode === "detailed"
        ? [
            { buttonId: `${prefixo || "/"}check ${url}`, buttonText: { displayText: "↻ Recheck" }, type: 1 },
            { buttonId: `${prefixo || "/"}check resumo ${url}`, buttonText: { displayText: "Resumo" }, type: 1 }
          ]
        : [
            { buttonId: `${prefixo || "/"}check ${url}`, buttonText: { displayText: "↻ Recheck" }, type: 1 },
            { buttonId: `${prefixo || "/"}check detailed ${url}`, buttonText: { displayText: "Detailed" }, type: 1 }
          ];

      await sock.sendMessage(
        from,
        {
          text: analyticsText,
          footer: "Yuki TikTok Checker",
          buttons
        },
        { quoted: msg }
      );
    } catch (err) {
      await sock.sendMessage(from, { text: erros_prontos || "Não consegui analisar esse TikTok." }, { quoted: msg });
      console.error("Erro no comando /check:", err?.response?.data || err);
    }
  }
};
