const crypto = require("crypto");
const mongoose = require("mongoose");
const { bolaoBets, bolaoDeliveries, bolaoGames, bolaoLedgers } = require("../database/models/bolao");
const { grupos } = require("../database/models/grupos");
const { users } = require("../database/models/users");
const { ownerLids, prefixo } = require("../config");
const { ensureGroup, ensureUser, getOwnerLevelCached, updateGroupAndCache, updateUserAndCache } = require("../utils/dbHelpers");
const { normalizeUserLid } = require("../utils/normalizeUserLid");

const MIN_BET = 100;
const OPEN_BEFORE_MS = 2 * 60 * 60 * 1000;
const REMINDER_BEFORE_MS = 30 * 60 * 1000;
const CLOSE_BEFORE_MS = 10 * 60 * 1000;
const RESULT_PROMPT_AFTER_MS = 2 * 60 * 60 * 1000;
const LEDGER_LOCK_TTL_MS = 5 * 60 * 1000;
const SOCKET_TIMEOUT_MS = 12 * 1000;
const MAX_MENTIONS = Number(process.env.BOLAO_MAX_MENTIONS || 200);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function withTimeout(promise, ms, message) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toObjectId(value) {
  if (!value) return null;
  const raw = String(value);
  if (!mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

function stripAccents(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugPart(value) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 22) || "jogo";
}

function cleanText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function compactText(value, limit = 80) {
  const text = cleanText(value);
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "sem data";
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {maximumFractionDigits: 0});
}

function parseLocalDateTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T])(\d{2}):(\d{2})$/);
  if (!match) {
    throw httpError(400, "data invalida. Use YYYY-MM-DD HH:mm.");
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(date.getTime())) {
    throw httpError(400, "data invalida.");
  }

  return date;
}

function parseScoreText(value) {
  const match = String(value || "").trim().match(/^(\d{1,2})\s*[xX:-]\s*(\d{1,2})$/);
  if (!match) throw httpError(400, "placar invalido. Use algo tipo 2x1.");
  return normalizeScore(match[1], match[2]);
}

function normalizeScore(homeScore, awayScore) {
  const home = Number(homeScore);
  const away = Number(awayScore);
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0 || home > 30 || away > 30) {
    throw httpError(400, "placar invalido.");
  }
  return {home, away};
}

function parseGameCreateText(text) {
  const parts = String(text || "").split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    throw httpError(400, "use: /bolao criar Brasil x Argentina | 2026-06-14 16:00 | Copa");
  }

  const teams = parts[0].split(/\s+(?:x|vs|versus)\s+/i).map((part) => cleanText(part));
  if (teams.length !== 2 || !teams[0] || !teams[1]) {
    throw httpError(400, "times invalidos. Use: Brasil x Argentina.");
  }

  return {
    homeTeam: teams[0],
    awayTeam: teams[1],
    startsAt: parseLocalDateTime(parts[1]),
    competition: parts[2] || "Copa do Mundo"
  };
}

function buildPanelLink(gameId) {
  const base = process.env.URL_BACKEND || "";
  if (!base) return `/painel#bolao/${gameId}`;

  const url = new URL("/painel", base);
  url.hash = `bolao/${gameId}`;
  return url.toString();
}

function getCuratorLids() {
  const configured = String(process.env.BOLAO_CURATOR_LIDS || "")
    .split(",")
    .map((item) => normalizeUserLid(item))
    .filter(Boolean);

  return configured.length ? configured : ownerLids.filter(Boolean);
}

async function isBolaoAdmin(sender) {
  return (await getOwnerLevelCached(sender)) >= 2;
}

async function assertBolaoAdmin(sender) {
  if (!(await isBolaoAdmin(sender))) {
    throw httpError(403, "somente dono real da Yuki pode gerenciar o bolao.");
  }
}

function gameTitle(input) {
  return `${cleanText(input.homeTeam, "Time A")} x ${cleanText(input.awayTeam, "Time B")}`;
}

async function createGame(input, sender, options = {}) {
  if (!options.skipPermission) await assertBolaoAdmin(sender);

  const startsAt = input.startsAt instanceof Date ? input.startsAt : parseLocalDateTime(input.startsAt);
  const now = new Date();
  if (!options.testMode && startsAt.getTime() <= now.getTime() + CLOSE_BEFORE_MS) {
    throw httpError(400, "crie jogos com pelo menos 10 minutos de antecedencia.");
  }

  const bettingOpensAt = input.bettingOpensAt ? new Date(input.bettingOpensAt) : new Date(startsAt.getTime() - OPEN_BEFORE_MS);
  const bettingClosesAt = input.bettingClosesAt ? new Date(input.bettingClosesAt) : new Date(startsAt.getTime() - CLOSE_BEFORE_MS);
  const reminderAt = input.reminderAt ? new Date(input.reminderAt) : new Date(startsAt.getTime() - REMINDER_BEFORE_MS);
  const resultPromptAt = input.resultPromptAt ? new Date(input.resultPromptAt) : new Date(startsAt.getTime() + RESULT_PROMPT_AFTER_MS);

  if (Number.isNaN(bettingOpensAt.getTime()) || Number.isNaN(bettingClosesAt.getTime())) {
    throw httpError(400, "janela de apostas invalida.");
  }

  if (bettingClosesAt.getTime() <= bettingOpensAt.getTime()) {
    throw httpError(400, "fechamento precisa ser depois da abertura.");
  }

  const targetGroupIds = Array.from(new Set((input.targetGroupIds || []).filter((id) => String(id || "").endsWith("@g.us"))));
  const baseCode = `${slugPart(input.homeTeam)}-${slugPart(input.awayTeam)}`;
  const status = now >= bettingClosesAt
    ? "closed"
    : now >= bettingOpensAt
      ? "open"
      : "scheduled";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = `${baseCode}-${crypto.randomBytes(2).toString("hex")}`;
    try {
      return await bolaoGames.create({
        code,
        competition: cleanText(input.competition, "Copa do Mundo"),
        homeTeam: cleanText(input.homeTeam, "Time A"),
        awayTeam: cleanText(input.awayTeam, "Time B"),
        title: gameTitle(input),
        startsAt,
        bettingOpensAt,
        bettingClosesAt,
        reminderAt,
        resultPromptAt,
        status,
        source: input.source || (options.testMode ? "test" : "manual"),
        createdBy: sender,
        targetGroupIds,
        testMode: !!options.testMode,
        config: {
          minBet: Number(input.minBet || MIN_BET),
          payoutMode: "pool_plus_stake_bonus",
          noWinnerPolicy: "refund_all"
        }
      });
    } catch (err) {
      if (err?.code !== 11000 || attempt === 4) throw err;
    }
  }

  throw httpError(500, "nao consegui gerar codigo unico para o jogo.");
}

async function findGameByRef(ref) {
  const raw = String(ref || "").trim();
  if (!raw) throw httpError(400, "jogo ausente.");

  const objectId = toObjectId(raw);
  const query = objectId ? {$or: [{_id: objectId}, {code: raw}]} : {code: raw};
  const game = await bolaoGames.findOne(query);
  if (!game) throw httpError(404, "jogo nao encontrado.");
  return game;
}

function serializeBet(bet) {
  if (!bet) return null;
  return {
    id: String(bet._id),
    gameId: String(bet.gameId),
    gameCode: bet.gameCode,
    userLid: bet.userLid,
    name: bet.name,
    groupId: bet.groupId,
    score: `${bet.homeScore}x${bet.awayScore}`,
    homeScore: bet.homeScore,
    awayScore: bet.awayScore,
    stake: bet.stake,
    status: bet.status,
    paidAmount: bet.paidAmount || 0,
    placedAt: toIso(bet.placedAt),
    updatedAt: toIso(bet.updatedAt)
  };
}

function statusLabel(status) {
  const labels = {
    scheduled: "Agendado",
    open: "Aberto",
    closed: "Fechado",
    awaiting_result: "Aguardando resultado",
    result_pending_confirmation: "Resultado em preview",
    paying: "Pagando",
    paid: "Pago",
    refunded: "Reembolsado",
    cancelled: "Cancelado"
  };

  return labels[status] || status;
}

function serializePreview(preview = {}) {
  return {
    generatedAt: toIso(preview.generatedAt),
    pool: preview.pool || 0,
    totalBets: preview.totalBets || 0,
    winnerCount: preview.winnerCount || 0,
    winnerStake: preview.winnerStake || 0,
    totalBonus: preview.totalBonus || 0,
    totalPayout: preview.totalPayout || 0,
    winners: (preview.winners || []).map((winner) => ({
      userLid: winner.userLid,
      name: winner.name,
      stake: winner.stake,
      score: `${winner.score?.home ?? 0}x${winner.score?.away ?? 0}`,
      poolShare: winner.poolShare || 0,
      bonus: winner.bonus || 0,
      total: winner.total || 0
    })),
    refunds: (preview.refunds || []).map((refund) => ({
      userLid: refund.userLid,
      name: refund.name,
      stake: refund.stake,
      score: `${refund.score?.home ?? 0}x${refund.score?.away ?? 0}`,
      total: refund.total || refund.stake || 0
    }))
  };
}

function serializeGame(game, extras = {}) {
  const raw = typeof game.toObject === "function" ? game.toObject() : game;
  const id = String(raw._id);
  const now = Date.now();
  const canBet = raw.status === "open" && now < new Date(raw.bettingClosesAt).getTime();

  return {
    id,
    code: raw.code,
    title: raw.title,
    competition: raw.competition,
    homeTeam: raw.homeTeam,
    awayTeam: raw.awayTeam,
    startsAt: toIso(raw.startsAt),
    bettingOpensAt: toIso(raw.bettingOpensAt),
    bettingClosesAt: toIso(raw.bettingClosesAt),
    reminderAt: toIso(raw.reminderAt),
    resultPromptAt: toIso(raw.resultPromptAt),
    status: raw.status,
    statusLabel: statusLabel(raw.status),
    canBet,
    testMode: !!raw.testMode,
    publicLink: buildPanelLink(id),
    result: raw.result?.homeScore !== null && raw.result?.awayScore !== null ? {
      score: `${raw.result.homeScore}x${raw.result.awayScore}`,
      homeScore: raw.result.homeScore,
      awayScore: raw.result.awayScore,
      setAt: toIso(raw.result.setAt)
    } : null,
    payoutPreview: serializePreview(raw.payoutPreview),
    ...extras
  };
}

async function getGameStats(gameIds) {
  if (!gameIds.length) return new Map();

  const stats = await bolaoBets.aggregate([
    {$match: {gameId: {$in: gameIds}, status: "active"}},
    {$group: {_id: "$gameId", pool: {$sum: "$stake"}, bets: {$sum: 1}}}
  ]);

  return new Map(stats.map((item) => [String(item._id), {pool: item.pool || 0, bets: item.bets || 0}]));
}

async function listPanelBolao(sender) {
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const games = await bolaoGames
    .find({
      $or: [
        {startsAt: {$gte: since}},
        {status: {$in: ["scheduled", "open", "closed", "awaiting_result", "result_pending_confirmation", "paying"]}}
      ],
      status: {$ne: "cancelled"}
    })
    .sort({startsAt: 1})
    .limit(40)
    .lean();

  const ids = games.map((game) => game._id);
  const [stats, userBets, admin, user] = await Promise.all([
    getGameStats(ids),
    ids.length ? bolaoBets.find({gameId: {$in: ids}, userLid: sender}).lean() : [],
    isBolaoAdmin(sender),
    users.findOne({userLid: sender}).select("dinheiro").lean()
  ]);

  const betsByGame = new Map(userBets.map((bet) => [String(bet.gameId), bet]));
  const serializedGames = games.map((game) => {
    const id = String(game._id);
    const stat = stats.get(id) || {pool: 0, bets: 0};
    return serializeGame(game, {
      pool: stat.pool,
      bets: stat.bets,
      userBet: serializeBet(betsByGame.get(id))
    });
  });

  const userActiveStake = userBets
    .filter((bet) => bet.status === "active")
    .reduce((sum, bet) => sum + Number(bet.stake || 0), 0);

  return {
    canManage: admin,
    balance: user?.dinheiro || 0,
    stats: {
      openGames: serializedGames.filter((game) => game.status === "open").length,
      pendingResults: serializedGames.filter((game) => ["closed", "awaiting_result", "result_pending_confirmation"].includes(game.status)).length,
      activeStake: userActiveStake,
      totalGames: serializedGames.length
    },
    games: serializedGames
  };
}

async function getPanelBolaoGame(sender, gameRef) {
  const game = await findGameByRef(gameRef);
  const gameId = game._id;
  const admin = await isBolaoAdmin(sender);
  const [stats, userBet, activeBets, finishedBets] = await Promise.all([
    getGameStats([gameId]),
    bolaoBets.findOne({gameId, userLid: sender}).lean(),
    admin || ["closed", "awaiting_result", "result_pending_confirmation", "paying"].includes(game.status)
      ? bolaoBets.find({gameId, status: "active"}).sort({stake: -1}).limit(100).lean()
      : Promise.resolve([]),
    ["paid", "refunded"].includes(game.status)
      ? bolaoBets.find({gameId, status: {$in: ["paid", "refunded", "lost"]}}).sort({paidAmount: -1, stake: -1}).limit(50).lean()
      : Promise.resolve([])
  ]);

  const stat = stats.get(String(gameId)) || {pool: 0, bets: 0};
  return {
    game: serializeGame(game, {
      pool: stat.pool,
      bets: stat.bets,
      userBet: serializeBet(userBet)
    }),
    canManage: admin,
    bets: activeBets.map((bet) => ({
      userLid: admin ? bet.userLid : null,
      name: bet.name,
      stake: bet.stake,
      score: admin || ["closed", "awaiting_result", "result_pending_confirmation", "paying"].includes(game.status)
        ? `${bet.homeScore}x${bet.awayScore}`
        : null,
      status: bet.status
    })),
    leaderboard: finishedBets.map((bet) => ({
      name: bet.name,
      stake: bet.stake,
      score: `${bet.homeScore}x${bet.awayScore}`,
      status: bet.status,
      paidAmount: bet.paidAmount || 0
    }))
  };
}

async function ensureGameOpen(game) {
  const now = new Date();
  if (game.status === "scheduled" && now >= game.bettingOpensAt && now < game.bettingClosesAt) {
    game.status = "open";
    await game.save();
  }

  if (game.status !== "open" || now < game.bettingOpensAt || now >= game.bettingClosesAt) {
    throw httpError(409, "apostas fechadas para esse jogo.");
  }
}

async function recordAppliedLedger(input) {
  await bolaoLedgers.updateOne(
    {transactionId: input.transactionId},
    {
      $setOnInsert: {
        transactionId: input.transactionId,
        gameId: input.gameId,
        gameCode: input.gameCode,
        userLid: input.userLid,
        type: input.type,
        amount: input.amount,
        status: "applied",
        appliedAt: new Date(),
        meta: input.meta || {},
        createdAt: new Date()
      }
    },
    {upsert: true}
  );
}

async function placeOrUpdateBet(input) {
  const sender = normalizeUserLid(input.sender);
  const name = cleanText(input.name, "Sem nome");
  const game = await findGameByRef(input.gameId || input.code);
  await ensureGameOpen(game);

  const score = normalizeScore(input.homeScore, input.awayScore);
  const stake = Math.floor(Number(input.amount || input.stake || 0));
  const minBet = Number(game.config?.minBet || MIN_BET);
  if (!Number.isFinite(stake) || stake < minBet) {
    throw httpError(400, `aposta minima: ${minBet} moedas.`);
  }

  const userDoc = await ensureUser(sender, name);
  const storedName = userDoc?.name || name;

  const existing = await bolaoBets.findOne({gameId: game._id, userLid: sender}).lean();
  if (existing && existing.status !== "active") {
    throw httpError(409, "essa aposta ja foi encerrada.");
  }

  const previousStake = existing?.stake || 0;
  const delta = stake - previousStake;
  let balanceDoc = null;

  if (delta > 0) {
    balanceDoc = await updateUserAndCache(
      sender,
      {$inc: {dinheiro: -delta}},
      {filter: {dinheiro: {$gte: delta}}, upsert: !existing, name: storedName}
    );

    if (!balanceDoc) throw httpError(402, "saldo insuficiente para essa aposta.");
  }

  if (delta < 0) {
    balanceDoc = await updateUserAndCache(sender, {$inc: {dinheiro: Math.abs(delta)}}, {upsert: true, name: storedName});
  }

  try {
    const bet = await bolaoBets.findOneAndUpdate(
      {gameId: game._id, userLid: sender},
      {
        $set: {
          gameCode: game.code,
          name: storedName,
          groupId: input.groupId || existing?.groupId || null,
          homeScore: score.home,
          awayScore: score.away,
          stake,
          status: "active",
          updatedAt: new Date()
        },
        $setOnInsert: {
          placedAt: new Date()
        },
        $inc: {
          revision: 1
        }
      },
      {upsert: true, new: true, setDefaultsOnInsert: true}
    );

    if (delta !== 0) {
      await recordAppliedLedger({
        transactionId: `stake:${game._id}:${sender}:${bet.revision}:${Date.now()}`,
        gameId: game._id,
        gameCode: game.code,
        userLid: sender,
        type: delta > 0 ? "stake" : "stake_adjust",
        amount: -delta,
        meta: {previousStake, stake, score}
      });
    }

    return {
      bet: serializeBet(bet),
      balance: balanceDoc?.dinheiro ?? null,
      game: serializeGame(game)
    };
  } catch (err) {
    if (delta > 0) await updateUserAndCache(sender, {$inc: {dinheiro: delta}}, {upsert: true, name: storedName});
    if (delta < 0) await updateUserAndCache(sender, {$inc: {dinheiro: delta}}, {filter: {dinheiro: {$gte: Math.abs(delta)}}});
    throw err;
  }
}

function buildPayout(activeBets, score) {
  const pool = activeBets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);
  const winners = activeBets.filter((bet) => bet.homeScore === score.home && bet.awayScore === score.away);
  const winnerStake = winners.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);

  if (!winners.length) {
    return {
      pool,
      totalBets: activeBets.length,
      winnerCount: 0,
      winnerStake: 0,
      totalBonus: 0,
      totalPayout: pool,
      winners: [],
      refunds: activeBets.map((bet) => ({
        userLid: bet.userLid,
        name: bet.name,
        stake: bet.stake,
        score: {home: bet.homeScore, away: bet.awayScore},
        poolShare: 0,
        bonus: 0,
        total: bet.stake
      }))
    };
  }

  const winnerRows = winners
    .map((bet) => ({
      userLid: bet.userLid,
      name: bet.name,
      stake: bet.stake,
      score: {home: bet.homeScore, away: bet.awayScore},
      poolShare: Math.floor((pool * bet.stake) / winnerStake),
      bonus: bet.stake,
      total: 0
    }))
    .sort((a, b) => b.stake - a.stake || a.userLid.localeCompare(b.userLid));

  let remainder = pool - winnerRows.reduce((sum, row) => sum + row.poolShare, 0);
  for (let index = 0; remainder > 0 && winnerRows.length; index = (index + 1) % winnerRows.length) {
    winnerRows[index].poolShare += 1;
    remainder -= 1;
  }

  for (const row of winnerRows) {
    row.total = row.poolShare + row.bonus;
  }

  return {
    pool,
    totalBets: activeBets.length,
    winnerCount: winnerRows.length,
    winnerStake,
    totalBonus: winnerRows.reduce((sum, row) => sum + row.bonus, 0),
    totalPayout: winnerRows.reduce((sum, row) => sum + row.total, 0),
    winners: winnerRows,
    refunds: []
  };
}

async function createResultPreview(gameRef, sender, scoreInput) {
  await assertBolaoAdmin(sender);

  const game = await findGameByRef(gameRef);
  if (!["closed", "awaiting_result", "result_pending_confirmation"].includes(game.status)) {
    throw httpError(409, "resultado so entra depois das apostas fecharem.");
  }

  const score = typeof scoreInput === "string"
    ? parseScoreText(scoreInput)
    : normalizeScore(scoreInput.homeScore ?? scoreInput.home, scoreInput.awayScore ?? scoreInput.away);

  const activeBets = await bolaoBets.find({gameId: game._id, status: "active"}).lean();
  const preview = buildPayout(activeBets, score);

  game.result = {
    homeScore: score.home,
    awayScore: score.away,
    setBy: sender,
    setAt: new Date()
  };
  game.payoutPreview = {
    generatedAt: new Date(),
    ...preview
  };
  game.status = "result_pending_confirmation";
  await game.save();

  return serializeGame(game, {
    pool: preview.pool,
    bets: preview.totalBets
  });
}

async function applyCreditLedger(input) {
  const now = new Date();
  await bolaoLedgers.updateOne(
    {transactionId: input.transactionId},
    {
      $setOnInsert: {
        transactionId: input.transactionId,
        gameId: input.gameId,
        gameCode: input.gameCode,
        userLid: input.userLid,
        type: input.type,
        amount: input.amount,
        status: "pending",
        meta: input.meta || {},
        createdAt: now
      }
    },
    {upsert: true}
  );

  const lockCutoff = new Date(Date.now() - LEDGER_LOCK_TTL_MS);
  const locked = await bolaoLedgers.findOneAndUpdate(
    {
      transactionId: input.transactionId,
      status: {$ne: "applied"},
      $or: [{lockedAt: null}, {lockedAt: {$lt: lockCutoff}}]
    },
    {$set: {lockedAt: now, status: "pending", error: null}},
    {new: true}
  );

  if (!locked) return {applied: false};

  try {
    await updateUserAndCache(input.userLid, {$inc: {dinheiro: input.amount}}, {upsert: true, name: input.name || "Sem nome"});
    await bolaoLedgers.updateOne(
      {transactionId: input.transactionId},
      {$set: {status: "applied", appliedAt: new Date(), error: null}, $unset: {lockedAt: ""}}
    );
    return {applied: true};
  } catch (err) {
    await bolaoLedgers.updateOne(
      {transactionId: input.transactionId},
      {$set: {status: "failed", error: err?.message || String(err)}, $unset: {lockedAt: ""}}
    );
    throw err;
  }
}

async function confirmPayout(gameRef, sender) {
  await assertBolaoAdmin(sender);

  let game = await findGameByRef(gameRef);
  if (["paid", "refunded"].includes(game.status)) {
    return serializeGame(game);
  }

  if (!["result_pending_confirmation", "paying"].includes(game.status)) {
    throw httpError(409, "gere o preview do resultado antes de pagar.");
  }

  if (game.status === "result_pending_confirmation") {
    const locked = await bolaoGames.findOneAndUpdate(
      {_id: game._id, status: "result_pending_confirmation"},
      {$set: {status: "paying", payoutStartedAt: new Date(), payoutConfirmedBy: sender}},
      {new: true}
    );
    if (!locked) throw httpError(409, "pagamento ja esta em andamento.");
    game = locked;
  }

  const activeBets = await bolaoBets.find({gameId: game._id, status: "active"}).lean();
  const preview = game.payoutPreview || {};
  const winners = new Map((preview.winners || []).map((winner) => [winner.userLid, winner]));

  if (!activeBets.length) {
    game.status = "refunded";
    game.paidAt = new Date();
    await game.save();
    return serializeGame(game);
  }

  if (!winners.size) {
    for (const bet of activeBets) {
      await applyCreditLedger({
        transactionId: `refund:${game._id}:${bet.userLid}`,
        gameId: game._id,
        gameCode: game.code,
        userLid: bet.userLid,
        name: bet.name,
        type: "refund",
        amount: bet.stake,
        meta: {reason: "no_winners"}
      });

      await bolaoBets.updateOne(
        {_id: bet._id, status: "active"},
        {$set: {status: "refunded", paidAmount: bet.stake, updatedAt: new Date()}}
      );
    }

    game.status = "refunded";
    game.paidAt = new Date();
    await game.save();
    return serializeGame(game);
  }

  for (const bet of activeBets) {
    const winner = winners.get(bet.userLid);
    if (winner) {
      await applyCreditLedger({
        transactionId: `payout:${game._id}:${bet.userLid}`,
        gameId: game._id,
        gameCode: game.code,
        userLid: bet.userLid,
        name: bet.name,
        type: "payout",
        amount: winner.total,
        meta: {poolShare: winner.poolShare, bonus: winner.bonus}
      });

      await bolaoBets.updateOne(
        {_id: bet._id, status: "active"},
        {$set: {status: "paid", paidAmount: winner.total, updatedAt: new Date()}}
      );
    } else {
      await bolaoBets.updateOne(
        {_id: bet._id, status: "active"},
        {$set: {status: "lost", paidAmount: 0, updatedAt: new Date()}}
      );
    }
  }

  game.status = "paid";
  game.paidAt = new Date();
  await game.save();
  return serializeGame(game);
}

async function refundActiveBets(game, type, reason) {
  const activeBets = await bolaoBets.find({gameId: game._id, status: "active"}).lean();
  for (const bet of activeBets) {
    await applyCreditLedger({
      transactionId: `${type}:${game._id}:${bet.userLid}`,
      gameId: game._id,
      gameCode: game.code,
      userLid: bet.userLid,
      name: bet.name,
      type,
      amount: bet.stake,
      meta: {reason}
    });

    await bolaoBets.updateOne(
      {_id: bet._id, status: "active"},
      {$set: {status: type === "cancel_refund" ? "cancelled" : "refunded", paidAmount: bet.stake, updatedAt: new Date()}}
    );
  }

  return activeBets.length;
}

async function cancelGame(gameRef, sender, reason = "cancelado pelo dono") {
  await assertBolaoAdmin(sender);
  const game = await findGameByRef(gameRef);
  if (["paid", "refunded", "cancelled"].includes(game.status)) {
    throw httpError(409, "esse jogo ja foi encerrado.");
  }

  const refunded = await refundActiveBets(game, "cancel_refund", reason);
  game.status = "cancelled";
  game.cancelledAt = new Date();
  game.cancelReason = reason;
  await game.save();

  return {game: serializeGame(game), refunded};
}

async function updateBolaoGroupConfig(sock, groupId, sender, enabled) {
  const { getGroupPermission } = require("../utils/dbHelpers");
  const permission = await getGroupPermission(sock, groupId, sender);
  if (!permission.allowed) throw httpError(403, "sem permissao para alterar o bolao desse grupo.");

  await ensureGroup(groupId, permission.metadata);
  const group = await updateGroupAndCache(groupId, {$set: {"configs.bolao": !!enabled}}, {metadata: permission.metadata});
  return {
    groupId: group.groupId,
    name: group.grupoName,
    bolao: group.configs?.bolao !== false
  };
}

async function getEnabledBolaoGroups(game) {
  const ids = Array.from(new Set((game.targetGroupIds || []).filter(Boolean)));
  if (ids.length) {
    const docs = await grupos.find({groupId: {$in: ids}}).lean();
    const map = new Map(docs.map((group) => [group.groupId, group]));
    return ids.map((id) => map.get(id) || {groupId: id, grupoName: "Grupo do teste", configs: {bolao: true}});
  }

  return grupos
    .find({
      groupId: /@g\.us$/,
      aluguel: {$gt: new Date()},
      "configs.bolao": {$ne: false}
    })
    .sort({grupoName: 1})
    .limit(Number(process.env.BOLAO_GROUP_LIMIT || 80))
    .lean();
}

function buildDeliveryKey(game, kind, targetId) {
  return `bolao:${game?._id || "system"}:${kind}:${targetId}`;
}

async function acquireDelivery({game, kind, targetId, dedupeKey: customDedupeKey}) {
  const dedupeKey = customDedupeKey || buildDeliveryKey(game, kind, targetId);
  const now = new Date();

  await bolaoDeliveries.updateOne(
    {dedupeKey},
    {
      $setOnInsert: {
        dedupeKey,
        gameId: toObjectId(game?._id) || null,
        gameCode: game?.code || null,
        targetId,
        kind,
        status: "pending",
        createdAt: now
      }
    },
    {upsert: true}
  );

  const lockCutoff = new Date(Date.now() - LEDGER_LOCK_TTL_MS);
  return bolaoDeliveries.findOneAndUpdate(
    {
      dedupeKey,
      status: {$ne: "success"},
      attempts: {$lt: 5},
      $or: [{lockedAt: null}, {lockedAt: {$lt: lockCutoff}}]
    },
    {$set: {lockedAt: now, updatedAt: now}, $inc: {attempts: 1}},
    {new: true}
  );
}

async function markDeliverySuccess(delivery, messageId) {
  await bolaoDeliveries.updateOne(
    {_id: delivery._id},
    {$set: {status: "success", sentAt: new Date(), messageId: messageId || null, updatedAt: new Date()}, $unset: {lockedAt: ""}}
  );
}

async function markDeliveryFailed(delivery, err) {
  await bolaoDeliveries.updateOne(
    {_id: delivery._id},
    {
      $set: {
        status: "failed",
        lastError: err?.message || String(err),
        updatedAt: new Date()
      },
      $unset: {lockedAt: ""}
    }
  );
}

async function getGroupMentions(sock, groupId) {
  try {
    const metadata = await withTimeout(sock.groupMetadata(groupId), SOCKET_TIMEOUT_MS, "metadata demorou");
    return (metadata.participants || [])
      .map((participant) => participant.id || participant.lid)
      .filter(Boolean)
      .slice(0, MAX_MENTIONS);
  } catch (err) {
    console.error("[bolao] nao consegui carregar mencoes:", groupId, err?.message || err);
    return [];
  }
}

function buildBolaoGroupText(game, kind) {
  const link = buildPanelLink(String(game._id));
  const header = kind === "reminder"
    ? "BOLAO DA YUKI - ULTIMA CHAMADA"
    : kind === "closed"
      ? "BOLAO DA YUKI - APOSTAS FECHADAS"
      : "BOLAO DA YUKI LIBERADO";

  if (kind === "closed") {
    return `*${header}*

${game.title}
Jogo: ${formatDateTime(game.startsAt)}

Agora e com o campo. Quando o resultado sair, a Yuki calcula os ganhadores e paga automatico depois da confirmacao do dono.`;
  }

  return `*${header}*

${game.title}
Competicao: ${game.competition}
Jogo: ${formatDateTime(game.startsAt)}
Fecha: ${formatDateTime(game.bettingClosesAt)}

Regra: placar exato. Minimo: ${game.config?.minBet || MIN_BET} moedas.
Premio: pool dividido entre quem cravar + bonus igual ao valor apostado.

Link seguro: ${link}
Sem sessao? Use ${prefixo || "/"}painel no WhatsApp e entre pela aba Bolao.`;
}

function buildBolaoResultText(game) {
  const preview = game.payoutPreview || {};
  const score = `${game.result?.homeScore ?? 0}x${game.result?.awayScore ?? 0}`;

  if (!preview.winnerCount) {
    return `*BOLAO DA YUKI - RESULTADO*

${game.title}: ${score}

Ninguem cravou o placar. A Yuki reembolsou ${preview.totalBets || 0} apostas, totalizando ${formatMoney(preview.pool || 0)} moedas.`;
  }

  const winners = (preview.winners || [])
    .slice(0, 8)
    .map((winner, index) => `${index + 1}. ${winner.name || winner.userLid} - +${formatMoney(winner.total)} moedas`)
    .join("\n");

  return `*BOLAO DA YUKI - PAGAMENTO FEITO*

${game.title}: ${score}

Pool: ${formatMoney(preview.pool || 0)} moedas
Ganhadores: ${preview.winnerCount}

${winners}${preview.winnerCount > 8 ? "\n..." : ""}`;
}

async function sendBolaoGroupDelivery(sock, group, game, kind) {
  if (!sock) throw new Error("socket indisponivel");
  const delivery = await acquireDelivery({game, kind, targetId: group.groupId});
  if (!delivery) return {skipped: true};

  try {
    const mentions = ["open", "reminder"].includes(kind) ? await getGroupMentions(sock, group.groupId) : [];
    const text = ["paid", "refunded"].includes(kind) ? buildBolaoResultText(game) : buildBolaoGroupText(game, kind);
    const sent = await sock.sendMessage(group.groupId, {text, mentions});
    await markDeliverySuccess(delivery, sent?.key?.id);
    return {sent: true};
  } catch (err) {
    await markDeliveryFailed(delivery, err);
    throw err;
  }
}

function buildOwnerReviewText(game) {
  return `Bolao quase abrindo:

${game.title}
Abre: ${formatDateTime(game.bettingOpensAt)}
Fecha: ${formatDateTime(game.bettingClosesAt)}
Link admin: ${buildPanelLink(String(game._id))}

Se precisar cancelar:
${prefixo || "/"}bolao cancelar ${game.code} motivo`;
}

function buildResultPromptText(game) {
  return `Resultado pendente do bolao:

${game.title}
Codigo: ${game.code}
Jogo: ${formatDateTime(game.startsAt)}

Quando terminar, mande:
${prefixo || "/"}bolao resultado ${game.code} 2x1

Depois confira o preview e confirme:
${prefixo || "/"}bolao pagar ${game.code}`;
}

async function sendOwnerDelivery(sock, targetId, kind, text, game = null, options = {}) {
  if (!sock) throw new Error("socket indisponivel");
  const delivery = await acquireDelivery({game, kind, targetId, dedupeKey: options.dedupeKey});
  if (!delivery) return {skipped: true};

  try {
    const sent = await sock.sendMessage(targetId, {text});
    await markDeliverySuccess(delivery, sent?.key?.id);
    return {sent: true};
  } catch (err) {
    await markDeliveryFailed(delivery, err);
    throw err;
  }
}

async function getCommandStatus(gameRef) {
  const game = await findGameByRef(gameRef);
  const [stats, bets] = await Promise.all([
    getGameStats([game._id]),
    bolaoBets.find({gameId: game._id}).sort({stake: -1}).limit(8).lean()
  ]);
  const stat = stats.get(String(game._id)) || {pool: 0, bets: 0};

  return {
    game: serializeGame(game, {pool: stat.pool, bets: stat.bets}),
    bets: bets.map(serializeBet)
  };
}

async function getOpenGames() {
  const now = new Date();
  return bolaoGames
    .find({status: "open", bettingClosesAt: {$gt: now}})
    .sort({bettingClosesAt: 1})
    .limit(8)
    .lean();
}

module.exports = {
  MIN_BET,
  buildBolaoGroupText,
  buildOwnerReviewText,
  buildPanelLink,
  buildResultPromptText,
  cancelGame,
  cleanText,
  compactText,
  confirmPayout,
  createGame,
  createResultPreview,
  formatDateTime,
  formatMoney,
  getCommandStatus,
  getCuratorLids,
  getEnabledBolaoGroups,
  getOpenGames,
  getPanelBolaoGame,
  httpError,
  isBolaoAdmin,
  listPanelBolao,
  parseGameCreateText,
  parseScoreText,
  placeOrUpdateBet,
  refundActiveBets,
  sendBolaoGroupDelivery,
  sendOwnerDelivery,
  serializeGame,
  toIso,
  updateBolaoGroupConfig
};
