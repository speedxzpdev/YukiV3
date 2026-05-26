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
  const bytes = toNumber(value);
  if (!bytes) return "N/A";
  const mb = bytes / (1024 * 1024);
  return `${mb.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
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

function formatFps(value) {
  const fps = toNumber(value);
  if (!fps) return "N/A";
  return `${fps.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} FPS`;
}

function formatBitrate(value) {
  const bitrate = toNumber(value);
  if (!bitrate) return "N/A kbps";
  return `${bitrate.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kbps`;
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
  return [
    formatResolution(item.resolution),
    formatFps(item.fps),
    item.codec || "N/A",
    formatBitrate(item.bitrate),
    formatBytes(item.file_size)
  ].join(" • ");
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

function isBrowserQuality(item) {
  const source = String(item?.source || "");
  const access = String(item?.access || "");
  const url = String(item?.url || "");
  return access.includes("🌐") || source === "yt-dlp" || /webapp|tiktokcdn/i.test(url);
}

function isPhoneQuality(item) {
  const source = String(item?.source || "");
  const access = String(item?.access || "");
  const url = String(item?.url || "");
  return access.includes("📱")
    || source === "tikwm:wmplay"
    || /api16-normal|tiktokv\.us|musically|aweme\/v1\/play/i.test(url);
}

function headerValue(headers, name) {
  return headers?.[name] || headers?.[name.toLowerCase()];
}

function qualityFromDownloadHeaders(data, headers) {
  const qualities = getQualities(data);
  const variant = headerValue(headers, "x-tiktok-quality-variant");
  const formatId = headerValue(headers, "x-tiktok-quality-format");
  const source = headerValue(headers, "x-tiktok-quality-source");

  const matched = qualities.find((item) => (
    (!variant || String(item.variant || "") === String(variant))
    && (!formatId || String(item.format_id || "") === String(formatId))
    && (!source || String(item.source || "") === String(source))
  ));
  if (matched) return matched;

  const width = toNumber(headerValue(headers, "x-tiktok-quality-width"));
  const height = toNumber(headerValue(headers, "x-tiktok-quality-height"));
  if (!variant && !formatId && !source && !width && !height) return null;

  return {
    label: headerValue(headers, "x-tiktok-quality-label") || variant || formatId || "quality",
    variant,
    format_id: formatId,
    source,
    resolution: width && height ? { width, height } : null,
    fps: toNumber(headerValue(headers, "x-tiktok-quality-fps")),
    bitrate: toNumber(headerValue(headers, "x-tiktok-quality-bitrate")),
    file_size: toNumber(headerValue(headers, "x-tiktok-quality-file-size")),
    watermarked: headerValue(headers, "x-tiktok-quality-watermarked") === "true"
  };
}

async function downloadApiStream(url, quality, data) {
  await ensureTikTokApiRunning();

  const response = await tiktokApi.get("/video/download", {
    params: { url, quality },
    responseType: "stream",
    timeout: Number(process.env.TIKTOK_MEDIA_TIMEOUT || 180000),
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  });

  return {
    stream: response.data,
    selectedQuality: qualityFromDownloadHeaders(data, response.headers)
  };
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
    null
  );
}

function qualityRank(item) {
  if (Array.isArray(item?.quality_score)) {
    return item.quality_score.map((value) => toNumber(value));
  }

  const resolution = item?.resolution || {};
  const bitrate = toNumber(item?.effective_bitrate || item?.bitrate);
  return [
    toNumber(resolution.width) * toNumber(resolution.height),
    toNumber(item?.fps),
    bitrate,
    toNumber(item?.file_size),
    isWatermarkedQuality(item) ? 0 : 1,
    String(item?.codec || "").toLowerCase().includes("265") ? 3 : 2
  ];
}

function selectOriginalQuality(data) {
  const qualities = getQualities(data);
  const downloadQuality = data?.download_quality;
  if (downloadQuality && !isWatermarkedQuality(downloadQuality)) return downloadQuality;

  const best = data?.best_quality;
  if (best && !isWatermarkedQuality(best)) return best;

  return (
    qualities.find((item) => item.is_download_best && !isWatermarkedQuality(item)) ||
    qualities.find((item) => item.is_best && !isWatermarkedQuality(item)) ||
    bestQuality(qualities, (item) => !isWatermarkedQuality(item))
  );
}

function buildAnalyticsSummaryText(data) {
  const user = data.user || {};
  const stats = data.stats || {};
  const sound = data.sound || {};
  const qualities = getQualities(data);
  const browserQuality = bestQuality(qualities, (item) => String(item.source || "") === "yt-dlp" && isBrowserQuality(item))
    || bestQuality(qualities, isBrowserQuality);
  const phoneQuality = bestQuality(qualities, (item) => String(item.source || "") === "tikwm:wmplay")
    || bestQuality(qualities, isPhoneQuality);
  const originalQuality = selectOriginalQuality(data);
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
    const trophy = item.is_best ? "🏆 " : "";
    return `${index + 1}. ${trophy}${item.label}
   Resolução: ${formatResolution(item.resolution)}
   FPS: ${formatFps(item.fps)}
   Variante: ${item.variant || "N/A"} | Formato: ${item.format_id || "N/A"}
   Codec: ${item.codec || "N/A"} | Taxa de bits: ${formatBitrate(item.bitrate)} | Tamanho: ${formatBytes(item.file_size)}
   Score: ${Array.isArray(item.quality_score) ? item.quality_score.join(".") : "N/A"}
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

  const isVideoMessage = delivery === "video";
  const { stream, selectedQuality } = await downloadApiStream(url, apiQuality, data);
  const shownQuality = selectedQuality || quality;
  const qualityLabel = shownQuality?.label
    ? ` - ${shownQuality.label} - ${qualitySummary(shownQuality)}`
    : "";

  await sock.sendMessage(
    from,
    { text: `Arquivo encontrado. Enviando o vídeo como ${isVideoMessage ? "vídeo normal" : "documento"} (${label}${qualityLabel})...` },
    { quoted: msg }
  );

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
      fileName: `${data.video_id || data.id || "tiktok"}-${shownQuality?.variant || label}.mp4`,
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

  const { stream } = await downloadApiStream(url, "audio", data);

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
