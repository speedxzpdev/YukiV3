const crypto = require("crypto");
const { grupos } = require("../../database/models/grupos");
const { donos } = require("../../database/models/donos");
const { prefixo } = require("../../config");

const pendingAnnouncements = new Map();

let runningAnnouncement = null;
let lastRunAt = 0;

const DEFAULT_LIMIT = 15;
const HARD_LIMIT = 25;
const DEFAULT_MIN_DELAY_SECONDS = 20;
const DEFAULT_MAX_DELAY_SECONDS = 20;
const MIN_ALLOWED_DELAY_SECONDS = 10;
const PENDING_TTL_MS = 10 * 60 * 1000;
const RUN_COOLDOWN_MS = 30 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function stripQuotes(value) {
  return String(value || "").trim().replace(/^["'`]+|["'`]+$/g, "").trim();
}

function parseArgs(args) {
  const options = {
    dryRun: false,
    limit: DEFAULT_LIMIT,
    minDelay: DEFAULT_MIN_DELAY_SECONDS,
    maxDelay: DEFAULT_MAX_DELAY_SECONDS,
    textParts: []
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = String(args[i] || "").trim();
    const lowered = arg.toLowerCase();

    if (lowered === "--dry" || lowered === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (lowered === "--limit") {
      options.limit = Number(args[i + 1]);
      i += 1;
      continue;
    }

    if (lowered === "--min-delay") {
      options.minDelay = Number(args[i + 1]);
      i += 1;
      continue;
    }

    if (lowered === "--max-delay") {
      options.maxDelay = Number(args[i + 1]);
      i += 1;
      continue;
    }

    options.textParts.push(arg);
  }

  options.limit = Math.min(Math.max(Number(options.limit) || DEFAULT_LIMIT, 1), HARD_LIMIT);
  options.minDelay = Math.max(Number(options.minDelay) || DEFAULT_MIN_DELAY_SECONDS, MIN_ALLOWED_DELAY_SECONDS);
  options.maxDelay = Math.max(Number(options.maxDelay) || DEFAULT_MAX_DELAY_SECONDS, options.minDelay);
  options.text = stripQuotes(options.textParts.join(" "));

  return options;
}

async function getAnnouncementGroups(limit) {
  const docs = await grupos
    .find({ groupId: /@g\.us$/, aluguel: { $gt: new Date() }})
    .select("groupId grupoName configs")
    .sort({ grupoName: 1 })
    .lean();

  const seen = new Set();
  const enabled = docs.filter((group) => {
    if (!group?.groupId || seen.has(group.groupId)) return false;
    seen.add(group.groupId);
    return group?.configs?.announcements !== false;
  });

  return {
    total: enabled.length,
    selected: enabled.slice(0, limit)
  };
}

function buildBroadcastText(text, ownerName) {
  return `📣 *Comunicado da Yuki*

${text}

_Enviado por ${ownerName || "um dono da Yuki"}._`;
}

async function runAnnouncement(sock, replyTo, quoted, pending) {
  const result = {
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  console.log(`[announcement] iniciando ${pending.id} com ${pending.groups.length} grupos`);

  try {
    for (const group of pending.groups) {
      const delaySeconds = randomBetween(pending.minDelay, pending.maxDelay);
      console.log(`[announcement] aguardando ${delaySeconds}s antes de enviar para ${group.groupId}`);
      await sleep(delaySeconds * 1000);

      try {
        await sock.sendMessage(group.groupId, { text: pending.message });
        result.sent += 1;
        console.log(`[announcement] enviado para ${group.groupId} (${group.grupoName || "sem nome"})`);
      } catch (err) {
        result.failed += 1;
        const errorText = err?.data || err?.message || String(err);
        result.errors.push(`${group.grupoName || group.groupId}: ${errorText}`);
        console.error(`[announcement] falhou em ${group.groupId}:`, errorText);

        if (String(errorText).includes("429") || String(errorText).includes("rate")) {
          const cooldown = pending.maxDelay * 2;
          console.log(`[announcement] rate limit detectado, pausa extra de ${cooldown}s`);
          await sleep(cooldown * 1000);
        }
      }
    }

    const errorsText = result.errors.length
      ? `\n\nFalhas:\n${result.errors.slice(0, 8).map((item) => `• ${item}`).join("\n")}`
      : "";

    await sock.sendMessage(
      replyTo,
      {
        text: `✅ Announcement finalizado.

Enviados: ${result.sent}
Falharam: ${result.failed}
Pulados: ${result.skipped}${errorsText}`
      },
      { quoted }
    );
  } finally {
    runningAnnouncement = null;
  }
}

async function assertOwner(sock, msg, from, sender) {
  const donoSender = await donos.findOne({ userLid: sender });
  if (donoSender) return true;

  await sock.sendMessage(from, { text: "Só dono pode usar announcement, meu mano." }, { quoted: msg });
  return false;
}

async function handleConfirm(sock, msg, from, args, sender) {
  const id = args[1];
  const pending = pendingAnnouncements.get(id);

  if (!pending || pending.sender !== sender || pending.expiresAt < Date.now()) {
    pendingAnnouncements.delete(id);
    await sock.sendMessage(from, { text: "Esse announcement expirou ou não é seu." }, { quoted: msg });
    return;
  }

  if (runningAnnouncement) {
    await sock.sendMessage(from, { text: `Já tem um announcement rodando agora: ${runningAnnouncement}` }, { quoted: msg });
    return;
  }

  if (Date.now() - lastRunAt < RUN_COOLDOWN_MS) {
    const remaining = Math.ceil((RUN_COOLDOWN_MS - (Date.now() - lastRunAt)) / 60000);
    await sock.sendMessage(from, { text: `Segura um pouco: cooldown de segurança ativo por mais ${remaining} min.` }, { quoted: msg });
    return;
  }

  pendingAnnouncements.delete(id);
  runningAnnouncement = id;
  lastRunAt = Date.now();

  await sock.sendMessage(
    from,
    {
      text: `📣 Announcement iniciado com segurança.

Grupos: ${pending.groups.length}
Delay: ${pending.minDelay}s a ${pending.maxDelay}s entre cada grupo

Primeiro envio sai em cerca de ${pending.minDelay}s, sem aquele chá de sumiço de 2 minutos.`
    },
    { quoted: msg }
  );

  runAnnouncement(sock, from, msg, pending).catch((err) => {
    runningAnnouncement = null;
    console.error("[announcement] erro geral:", err);
  });
}

async function handleCancel(sock, msg, from, args, sender) {
  const id = args[1];
  const pending = pendingAnnouncements.get(id);

  if (!pending || pending.sender !== sender) {
    await sock.sendMessage(from, { text: "Não achei esse announcement pendente pra cancelar." }, { quoted: msg });
    return;
  }

  pendingAnnouncements.delete(id);
  await sock.sendMessage(from, { text: "Announcement cancelado, nada foi enviado." }, { quoted: msg });
}

module.exports = {
  name: "annoucement",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      if (!(await assertOwner(sock, msg, from, sender))) return;

      const action = String(args[0] || "").toLowerCase();
      if (action === "confirm") {
        await handleConfirm(sock, msg, from, args, sender);
        return;
      }

      if (action === "cancel") {
        await handleCancel(sock, msg, from, args, sender);
        return;
      }

      if (action === "status") {
        await sock.sendMessage(
          from,
          { text: runningAnnouncement ? `Announcement rodando: ${runningAnnouncement}` : "Nenhum announcement rodando agora." },
          { quoted: msg }
        );
        return;
      }

      const options = parseArgs(args);
      if (!options.text) {
        await sock.sendMessage(
          from,
          {
            text: `Use: ${prefixo || "/"}annoucement "texto do recado"

Extras:
• --dry pra testar sem enviar
• --limit 10 pra limitar o lote
• --min-delay 20 --max-delay 20 pra controlar o intervalo`
          },
          { quoted: msg }
        );
        return;
      }

      const { total, selected } = await getAnnouncementGroups(options.limit);
      if (!selected.length) {
        await sock.sendMessage(from, { text: "Não encontrei nenhum grupo cadastrado pra enviar." }, { quoted: msg });
        return;
      }

      const message = buildBroadcastText(options.text, msg.pushName);
      const previewGroups = selected
        .slice(0, 8)
        .map((group, index) => `${index + 1}. ${group.grupoName || group.groupId}`)
        .join("\n");
      const remainingText = total > selected.length
        ? `\n\n⚠️ Existem ${total} grupos, mas por segurança esse lote vai mandar só para ${selected.length}.`
        : "";

      if (options.dryRun) {
        await sock.sendMessage(
          from,
          {
            text: `🧪 Dry-run do announcement.

Grupos que receberiam: ${selected.length}/${total}
Delay: ${options.minDelay}s a ${options.maxDelay}s

Prévia:
${message}

Grupos:
${previewGroups}${selected.length > 8 ? "\n..." : ""}${remainingText}`
          },
          { quoted: msg }
        );
        return;
      }

      const id = crypto.randomBytes(4).toString("hex");
      pendingAnnouncements.set(id, {
        id,
        sender,
        groups: selected,
        message,
        minDelay: options.minDelay,
        maxDelay: options.maxDelay,
        expiresAt: Date.now() + PENDING_TTL_MS
      });

      const buttons = [
        { buttonId: `${prefixo || "/"}annoucement confirm ${id}`, buttonText: { displayText: "Confirmar envio" }, type: 1 },
        { buttonId: `${prefixo || "/"}annoucement cancel ${id}`, buttonText: { displayText: "Cancelar" }, type: 1 }
      ];

      await sock.sendMessage(
        from,
        {
          text: `📣 *Preview do announcement*

Grupos: ${selected.length}/${total}
Delay: ${options.minDelay}s a ${options.maxDelay}s entre grupos
Expira em: 10 min

Mensagem:
${message}

Grupos:
${previewGroups}${selected.length > 8 ? "\n..." : ""}${remainingText}

Confirma o envio?`,
          footer: "Modo seguro: envio lento, com confirmação e cooldown.",
          buttons
        },
        { quoted: msg }
      );
    } catch (err) {
      await sock.sendMessage(from, { text: erros_prontos || "Deu ruim no announcement." }, { quoted: msg });
      console.error("Erro no comando /annoucement:", err);
    }
  }
};
