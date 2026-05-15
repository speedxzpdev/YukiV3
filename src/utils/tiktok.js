const axios = require("axios");
const { users } = require("../database/models/users");
const { normalizeUserLid } = require("./normalizeUserLid");
const { ensureTikTokApiRunning } = require("./tiktokApiRuntime");

const tiktokApi = axios.create({
  baseURL: process.env.TIKTOK_API_URL || "http://127.0.0.1:8000",
  timeout: Number(process.env.TIKTOK_API_TIMEOUT || 30000)
});

function isTikTokUrl(value) {
  return /^https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\//i.test(String(value || "").trim());
}

function compactUrl(value, max = 52) {
  const text = String(value || "");
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function formatNumber(value) {
  if (value === null || value === undefined) return "N/A";
  return Number(value).toLocaleString("pt-BR");
}

function formatBytes(value) {
  if (!value) return "N/A";
  const mb = Number(value) / (1024 * 1024);
  return `${mb.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "N/A";
  const total = Number(seconds);
  const min = Math.floor(total / 60);
  const sec = Math.floor(total % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function formatResolution(resolution) {
  if (!resolution) return "N/A";
  const { width, height } = resolution;
  if (!width || !height) return "N/A";
  return `${width}x${height}`;
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function compactText(value, max = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "Sem legenda";
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function isWatermarkedQuality(item) {
  const variant = String(item?.variant || "");
  const formatId = String(item?.format_id || "");
  const source = String(item?.source || "");
  const note = String(item?.format_note || "");
  return Boolean(item?.watermarked)
    || variant === "wmplay_addr"
    || formatId === "download"
    || source === "tikwm:wmplay"
    || note.toLowerCase().includes("watermark");
}

function qualitySummary(item) {
  if (!item) return "N/A";
  const parts = [
    formatResolution(item.resolution),
    item.codec,
    item.bitrate ? `${item.bitrate} kbps` : null,
    formatBytes(item.file_size)
  ].filter((part) => part && part !== "N/A");
  return parts.length ? parts.join(" • ") : "N/A";
}

function compareQuality(a, b) {
  const left = qualityRank(a);
  const right = qualityRank(b);
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

function bestQuality(qualities, filter) {
  return qualities
    .filter((item) => item?.url && (!filter || filter(item)))
    .sort((a, b) => compareQuality(b, a))[0] || null;
}

function isLikelyDownloadableQuality(item) {
  const source = String(item?.source || "");
  const url = String(item?.url || "");
  return source.startsWith("tikwm:") || !/webapp-prime/i.test(url);
}

async function downloadApiStream(url, quality) {
  await ensureTikTokApiRunning();

  const response = await tiktokApi.get("/video/download", {
    params: { url, quality },
    responseType: "stream",
    timeout: Number(process.env.TIKTOK_MEDIA_TIMEOUT || 180000),
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  });

  return response.data;
}

async function getInfo(url) {
  if (!isTikTokUrl(url)) {
    throw new Error("Link do TikTok inválido.");
  }

  await ensureTikTokApiRunning();

  const response = await tiktokApi.get("/video/info", {
    params: { url }
  });

  return response.data;
}

function getQualities(data) {
  return Array.isArray(data?.qualities) ? data.qualities : [];
}

function selectNormalQuality(data) {
  const qualities = getQualities(data);
  return (
    qualities.find((item) => item.variant === "play_addr" && item.source === "tikwm:play") ||
    qualities.find((item) => item.label?.includes("play_addr") && !isWatermarkedQuality(item)) ||
    qualities.find((item) => !isWatermarkedQuality(item)) ||
    qualities[0]
  );
}

function qualityRank(item) {
  const resolution = item?.resolution || {};
  return [
    Number(resolution.width || 0) * Number(resolution.height || 0),
    Number(item?.bitrate || 0),
    Number(item?.file_size || 0)
  ];
}

function selectOriginalQuality(data) {
  const qualities = getQualities(data);
  const cleanQualities = qualities.filter((item) => !isWatermarkedQuality(item));
  const candidates = cleanQualities.length ? cleanQualities : qualities;

  return candidates.reduce((best, item) => {
    if (!best) return item;
    const currentRank = qualityRank(item);
    const bestRank = qualityRank(best);
    for (let i = 0; i < currentRank.length; i += 1) {
      if (currentRank[i] > bestRank[i]) return item;
      if (currentRank[i] < bestRank[i]) return best;
    }
    return best;
  }, null);
}

function buildAnalyticsSummaryText(data) {
  const user = data.user || {};
  const stats = data.stats || {};
  const sound = data.sound || {};
  const qualities = getQualities(data);
  const cleanQualities = qualities.filter((item) => !isWatermarkedQuality(item));
  const browserQuality = bestQuality(cleanQualities, (item) => String(item.source || "") === "yt-dlp");
  const phoneQuality = bestQuality(cleanQualities, (item) => String(item.source || "").startsWith("tikwm:"));
  const originalQuality = bestQuality(cleanQualities);
  const categories = (data.categories || []).join(", ") || "N/A";
  const tags = (data.tags || []).slice(0, 8).map((tag) => `#${tag}`).join(" ") || "N/A";
  const tips = (data.content_tips || []).slice(0, 3).join("\n│ ") || "Toque em Detailed pra ver as variantes completas.";

  return `▣ *VÍDEO • ANÁLISE*

👤 *${user.nickname || user.username || "Usuário desconhecido"}*
🗓️ ${formatDateTime(data.posted_at)}

❝ ${compactText(data.caption, 150)} ❞

♫ *Som* • ${formatDuration(sound.duration)}
${sound.title || "N/A"}

▥ *Estatísticas*
• 👁️ ${formatNumber(stats.views)} views
• 🤍 ${formatNumber(stats.likes)} curtidas
• 💬 ${formatNumber(stats.comments)} comentários
• 🔖 ${formatNumber(stats.favorites)} favoritos
• ↗️ ${formatNumber(stats.shares)} compartilhamentos
• ⬇️ ${formatNumber(stats.downloads)} downloads

ⓘ *Informações*
• ID | ${data.video_id || data.id || "N/A"}
• Região | ${data.region || "N/A"}
• Fonte | ${data.source || "Soon"}
• Shadow ban | ${data.shadow_ban_status || "N/A"}

☆ *Qualidade*
• 🌐 Browser | ${qualitySummary(browserQuality)}
• 📱 Phone | ${qualitySummary(phoneQuality)}
• Original | ${qualitySummary(originalQuality)}
• VQ Score | ${data.vq_score ?? "N/A"}

☷ *Categorias*
│ ${categories}

💡 *Dicas*
│ ${tips}

🏷️ *Tags*
${tags}`;
}

function buildAnalyticsDetailText(data) {
  const user = data.user || {};
  const stats = data.stats || {};
  const sound = data.sound || {};
  const qualities = getQualities(data);
  const qualityLines = qualities.map((item, index) => {
    return `${index + 1}. ${item.label}
   Resolução: ${formatResolution(item.resolution)}
   Variante: ${item.variant || "N/A"} | Formato: ${item.format_id || "N/A"}
   Codec: ${item.codec || "N/A"} | Taxa de bits: ${item.bitrate || "N/A"} kbps | Tamanho: ${formatBytes(item.file_size)}
   Fonte: ${item.source || "N/A"} | Marca d'água: ${isWatermarkedQuality(item) ? "sim" : "não"}
   URL: ${item.url ? compactUrl(item.url, 80) : "N/A"}`;
  });

  return `*Análise detalhada de TikTok da Yuki*

*Vídeo*
ID: ${data.video_id || data.id || "N/A"}
Perfil: ${user.profile_url || data.profile_url || "N/A"}
Usuário: ${user.username || "N/A"}
Postado em: ${formatDateTime(data.posted_at)}
Legenda: ${data.caption || "Sem legenda"}
Região: ${data.region || "N/A"}
Fonte: ${data.source || "Soon"}
Status de shadow ban: ${data.shadow_ban_status || "N/A"}
Resolução original: ${data.original_resolution || "N/A"}
Pontuação VQ: ${data.vq_score ?? "N/A"}

*Som*
Título: ${sound.title || "N/A"}
Duração: ${formatDuration(sound.duration)}
URL: ${sound.url ? compactUrl(sound.url) : "N/A"}

*Estatísticas*
Visualizações: ${formatNumber(stats.views)}
Curtidas: ${formatNumber(stats.likes)}
Comentários: ${formatNumber(stats.comments)}
Favoritos: ${formatNumber(stats.favorites)}
Compartilhamentos: ${formatNumber(stats.shares)}
Downloads: ${formatNumber(stats.downloads)}

*Qualidades*
${qualityLines.length ? qualityLines.join("\n\n") : "Nenhuma qualidade encontrada."}

*Categorias*
${(data.categories || []).join(", ") || "N/A"}

*Tags*
${(data.tags || []).map((tag) => `#${tag}`).join(" ") || "N/A"}`;
}

async function countDownload(sender) {
  const userLid = normalizeUserLid(sender);
  if (!userLid) return;
  try {
    await users.updateOne({ userLid }, { $inc: { donwloads: 1 } }, { upsert: true });
  } catch (err) {
    console.error("Falha ao atualizar contador de downloads:", err);
  }
}

async function sendVideoDocument(sock, msg, from, data, url, label, apiQuality, quality, delivery = "document") {
  if (!url) {
    await sock.sendMessage(from, { text: "Não encontrei uma URL válida para essa opção." }, { quoted: msg });
    return;
  }

  const qualityLabel = quality?.label ? ` - ${quality.label}` : "";
  const isVideoMessage = delivery === "video";
  await sock.sendMessage(
    from,
    { text: `Arquivo encontrado. Enviando o vídeo como ${isVideoMessage ? "vídeo normal" : "documento"} (${label}${qualityLabel})...` },
    { quoted: msg }
  );

  const stream = await downloadApiStream(url, apiQuality);

  if (isVideoMessage) {
    await sock.sendMessage(
      from,
      {
        video: { stream },
        mimetype: "video/mp4",
        caption: `Aqui está o vídeo: ${label}.\n\nObs: como vídeo normal, o WhatsApp pode comprimir.`
      },
      { quoted: msg }
    );
    return;
  }

  await sock.sendMessage(
    from,
    {
      document: { stream },
      mimetype: "video/mp4",
      fileName: `${data.video_id || data.id || "tiktok"}-${label}.mp4`,
      caption: `Aqui está o vídeo em modo documento: ${label}.`
    },
    { quoted: msg }
  );
}

async function sendAudioDocument(sock, msg, from, data, url) {
  const sound = data.sound || {};
  if (!sound.url) {
    await sock.sendMessage(from, { text: "Não encontrei áudio separado para esse vídeo." }, { quoted: msg });
    return;
  }

  await sock.sendMessage(from, { text: "Arquivo encontrado. Enviando o áudio como documento..." }, { quoted: msg });

  const stream = await downloadApiStream(url, "audio");

  await sock.sendMessage(
    from,
    {
      document: { stream },
      mimetype: "audio/mpeg",
      fileName: `${data.video_id || data.id || "tiktok"}-audio.mp3`,
      caption: "Aqui está apenas o áudio em modo documento."
    },
    { quoted: msg }
  );
}

async function sendDownloadOptions(sock, msg, from, url, prefix = "/") {
  const buttons = [
    { buttonId: `${prefix}download normal ${url}`, buttonText: { displayText: "Normal" }, type: 1 },
    { buttonId: `${prefix}download original ${url}`, buttonText: { displayText: "Qualidade original" }, type: 1 },
    { buttonId: `${prefix}download audio ${url}`, buttonText: { displayText: "Apenas áudio" }, type: 1 }
  ];

  await sock.sendMessage(
    from,
    {
      text: "Escolha o que a Yuki deve baixar desse TikTok:",
      footer: "Depois você escolhe se quer documento ou vídeo normal.",
      buttons
    },
    { quoted: msg }
  );
}

async function sendDownloadDeliveryOptions(sock, msg, from, url, option, prefix = "/") {
  const label = option === "original" ? "qualidade original" : "normal";
  const buttons = [
    { buttonId: `${prefix}download ${option} doc ${url}`, buttonText: { displayText: "Documento" }, type: 1 },
    { buttonId: `${prefix}download ${option} video ${url}`, buttonText: { displayText: "Vídeo normal" }, type: 1 }
  ];

  await sock.sendMessage(
    from,
    {
      text: `Como você quer receber o TikTok em ${label}?`,
      footer: "Documento preserva melhor a qualidade. Vídeo normal pode ser comprimido pelo WhatsApp.",
      buttons
    },
    { quoted: msg }
  );
}

async function handleDownloadChoice(sock, msg, from, url, option, sender, delivery = "document") {
  const data = await getInfo(url);

  if (option === "audio") {
    await sendAudioDocument(sock, msg, from, data, url);
    await countDownload(sender);
    return data;
  }

  if (option === "original") {
    await sendVideoDocument(sock, msg, from, data, url, "qualidade-original", "original", selectOriginalQuality(data), delivery);
    await countDownload(sender);
    return data;
  }

  await sendVideoDocument(sock, msg, from, data, url, "normal", "normal", selectNormalQuality(data), delivery);
  await countDownload(sender);
  return data;
}

async function tiktokDl(sock, msg, from, body, erros_prontos, espera_pronta, sender) {
  try {
    await sock.sendMessage(from, { text: espera_pronta || "Buscando dados do TikTok..." }, { quoted: msg });
    const data = await getInfo(body);

    return {
      data,
      baixarDl: async () => {
        await handleDownloadChoice(sock, msg, from, body, "original", sender);
      },
      audio: data.sound?.url,
      nome: data.user?.nickname || data.user?.username || "N/A",
      duracao: formatDuration(data.sound?.duration),
      titulo: data.caption || "Sem legenda",
      avatar: null
    };
  } catch (err) {
    await sock.sendMessage(from, { text: erros_prontos || "Não consegui processar esse TikTok." }, { quoted: msg });
    console.error("Erro no TikTok local:", err?.response?.data || err);
    return null;
  }
}

module.exports = {
  buildAnalyticsText: buildAnalyticsDetailText,
  buildAnalyticsDetailText,
  buildAnalyticsSummaryText,
  getInfo,
  handleDownloadChoice,
  isTikTokUrl,
  selectNormalQuality,
  selectOriginalQuality,
  sendAudioDocument,
  sendDownloadDeliveryOptions,
  sendDownloadOptions,
  tiktokDl
};
