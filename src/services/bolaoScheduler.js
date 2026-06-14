const { bolaoGames } = require("../database/models/bolao");
const {
  buildOwnerReviewText,
  buildResultPromptText,
  confirmPayout,
  getCuratorLids,
  getEnabledBolaoGroups,
  sendBolaoGroupDelivery,
  sendOwnerDelivery
} = require("./bolaoService");

const RECONCILE_INTERVAL_MS = Number(process.env.BOLAO_RECONCILE_INTERVAL_MS || 60 * 1000);
const OWNER_REVIEW_BEFORE_MS = 20 * 60 * 1000;

let schedulerTimer = null;
let activeSock = null;
let running = false;

function due(date, now) {
  return date && new Date(date).getTime() <= now.getTime();
}

async function sendToGameGroups(sock, game, kind) {
  const groups = await getEnabledBolaoGroups(game);
  for (const group of groups) {
    try {
      await sendBolaoGroupDelivery(sock, group, game, kind);
    } catch (err) {
      console.error(`[bolao] falha ao enviar ${kind} para ${group.groupId}:`, err?.message || err);
    }
  }
}

async function sendToCurators(sock, game, kind, text) {
  for (const ownerLid of getCuratorLids()) {
    try {
      await sendOwnerDelivery(sock, ownerLid, kind, text, game);
    } catch (err) {
      console.error(`[bolao] falha ao avisar curador ${ownerLid}:`, err?.message || err);
    }
  }
}

async function reconcileOwnerDailyPrompt(sock, now) {
  const configuredHour = Number(process.env.BOLAO_DAILY_PROMPT_HOUR || 9);
  if (!Number.isInteger(configuredHour) || configuredHour < 0 || configuredHour > 23) return;

  const localHour = Number(now.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false
  }));
  const localDate = now.toLocaleDateString("pt-BR", {timeZone: "America/Sao_Paulo"});
  const dailyKey = localDate.replace(/\D/g, "");

  if (localHour !== configuredHour) return;

  const text = `Curadoria do bolao da Yuki

Tem jogo hoje? Se tiver, cadastra assim:
/bolao criar Brasil x Argentina | 2026-06-14 16:00 | Copa

Tambem da para cadastrar pelo painel, na aba Bolao.`;

  for (const ownerLid of getCuratorLids()) {
    try {
      await sendOwnerDelivery(sock, ownerLid, "owner_daily", text, null, {
        dedupeKey: `bolao:daily:${dailyKey}:${ownerLid}`
      });
    } catch (err) {
      console.error(`[bolao] falha no prompt diario para ${ownerLid}:`, err?.message || err);
    }
  }
}

async function reconcileGame(sock, game, now) {
  const reviewAt = new Date(new Date(game.bettingOpensAt).getTime() - OWNER_REVIEW_BEFORE_MS);

  if (due(reviewAt, now)) {
    await sendToCurators(sock, game, "owner_review", buildOwnerReviewText(game));
  }

  if (["scheduled"].includes(game.status) && due(game.bettingOpensAt, now)) {
    const opened = await bolaoGames.findOneAndUpdate(
      {_id: game._id, status: "scheduled"},
      {$set: {status: "open"}},
      {new: true}
    );
    if (opened) {
      await sendToGameGroups(sock, opened, "open");
      game.status = "open";
    }
  }

  if (game.status === "open" && due(game.bettingOpensAt, now)) {
    await sendToGameGroups(sock, game, "open");
  }

  if (game.status === "open" && due(game.reminderAt, now)) {
    await sendToGameGroups(sock, game, "reminder");
  }

  if (["scheduled", "open"].includes(game.status) && due(game.bettingClosesAt, now)) {
    const closed = await bolaoGames.findOneAndUpdate(
      {_id: game._id, status: {$in: ["scheduled", "open"]}},
      {$set: {status: "closed"}},
      {new: true}
    );
    if (closed) {
      await sendToGameGroups(sock, closed, "closed");
      game.status = "closed";
    }
  }

  if (["closed"].includes(game.status) && due(game.resultPromptAt, now)) {
    const waiting = await bolaoGames.findOneAndUpdate(
      {_id: game._id, status: "closed"},
      {$set: {status: "awaiting_result"}},
      {new: true}
    );
    if (waiting) {
      await sendToCurators(sock, waiting, "result_prompt", buildResultPromptText(waiting));
      game.status = "awaiting_result";
    }
  }

  if (game.status === "awaiting_result" && due(game.resultPromptAt, now)) {
    await sendToCurators(sock, game, "result_prompt", buildResultPromptText(game));
  }

  if (game.status === "paying") {
    try {
      const paid = await confirmPayout(game._id, game.payoutConfirmedBy || game.createdBy);
      const fresh = await bolaoGames.findById(game._id).lean();
      if (fresh && ["paid", "refunded"].includes(fresh.status)) {
        await sendToGameGroups(sock, fresh, fresh.status);
      }
      return paid;
    } catch (err) {
      console.error(`[bolao] falha ao retomar pagamento ${game.code}:`, err?.message || err);
    }
  }

  if (["paid", "refunded"].includes(game.status)) {
    await sendToGameGroups(sock, game, game.status);
  }

  return null;
}

async function reconcileBolaoOnce(sock = activeSock) {
  if (!sock) return;
  if (running) return;

  running = true;
  try {
    const now = new Date();
    await reconcileOwnerDailyPrompt(sock, now);

    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const recentPaidCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const games = await bolaoGames
      .find({
        $or: [
          {
            status: {$in: ["scheduled", "open", "closed", "awaiting_result", "paying"]},
            startsAt: {$lte: horizon}
          },
          {
            status: {$in: ["paid", "refunded"]},
            paidAt: {$gte: recentPaidCutoff}
          }
        ]
      })
      .sort({startsAt: 1})
      .limit(80);

    for (const game of games) {
      await reconcileGame(sock, game, now);
    }
  } catch (err) {
    console.error("[bolao] erro no reconciler:", err);
  } finally {
    running = false;
  }
}

function startBolaoScheduler(sock) {
  activeSock = sock;

  if (schedulerTimer) return;

  reconcileBolaoOnce(sock).catch((err) => {
    console.error("[bolao] erro no primeiro reconcile:", err);
  });

  schedulerTimer = setInterval(() => {
    reconcileBolaoOnce().catch((err) => {
      console.error("[bolao] erro no intervalo:", err);
    });
  }, RECONCILE_INTERVAL_MS);

  if (typeof schedulerTimer.unref === "function") schedulerTimer.unref();
}

function stopBolaoScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = null;
}

module.exports = {
  reconcileBolaoOnce,
  startBolaoScheduler,
  stopBolaoScheduler
};
