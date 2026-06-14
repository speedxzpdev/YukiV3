const crypto = require("crypto");
const mongoose = require("mongoose");
const { bolaoBets, bolaoGames, bolaoLedgers } = require("../database/models/bolao");
const { users } = require("../database/models/users");
const { prefixo } = require("../config");
const { ensureUser, getOwnerLevelCached, updateUserAndCache } = require("../utils/dbHelpers");
const { normalizeUserLid } = require("../utils/normalizeUserLid");

const MIN_BET = 100;
const DEFAULT_CLOSE_BEFORE_MS = 10 * 60 * 1000;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value, fallback = "") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toObjectId(value) {
  const raw = String(value || "");
  return mongoose.Types.ObjectId.isValid(raw) ? new mongoose.Types.ObjectId(raw) : null;
}

function stripAccents(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slug(value) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20) || "jogo";
}

function parseLocalDateTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T])(\d{2}):(\d{2})$/);
  if (!match) throw httpError(400, "data invalida. Use YYYY-MM-DD HH:mm.");

  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(date.getTime())) throw httpError(400, "data invalida.");
  return date;
}

function parseScoreText(value) {
  const match = String(value || "").trim().match(/^(\d{1,2})\s*[xX:-]\s*(\d{1,2})$/);
  if (!match) throw httpError(400, "placar invalido. Use 2x1.");
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
    throw httpError(400, "times invalidos. Use Brasil x Argentina.");
  }

  return {
    homeTeam: teams[0],
    awayTeam: teams[1],
    startsAt: parseLocalDateTime(parts[1]),
    competition: parts[2] || "Copa do Mundo"
  };
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

function buildPanelLink(gameId) {
  const base = process.env.URL_BACKEND;
  if (!base) return `/painel#bolao/${gameId}`;
  const url = new URL("/painel", base);
  url.hash = `bolao/${gameId}`;
  return url.toString();
}

async function isBolaoAdmin(sender) {
  return (await getOwnerLevelCached(sender)) >= 2;
}

async function assertBolaoAdmin(sender) {
  if (!(await isBolaoAdmin(sender))) {
    throw httpError(403, "somente dono real da Yuki pode gerenciar o bolao.");
  }
}

async function findGame(ref) {
  const raw = String(ref || "").trim();
  if (!raw) throw httpError(400, "jogo ausente.");

  const objectId = toObjectId(raw);
  const query = objectId ? {$or: [{_id: objectId}, {code: raw}]} : {code: raw};
  const game = await bolaoGames.findOne(query);
  if (!game) throw httpError(404, "jogo nao encontrado.");
  return game;
}

async function createGame(input, sender, options = {}) {
  await assertBolaoAdmin(sender);

  const startsAt = input.startsAt instanceof Date ? input.startsAt : parseLocalDateTime(input.startsAt);
  const closesAt = input.closesAt ? new Date(input.closesAt) : new Date(startsAt.getTime() - DEFAULT_CLOSE_BEFORE_MS);
  if (!options.testMode && closesAt.getTime() <= Date.now()) {
    throw httpError(400, "o fechamento da aposta ja passou.");
  }

  const title = `${cleanText(input.homeTeam, "Time A")} x ${cleanText(input.awayTeam, "Time B")}`;
  const code = `${slug(input.homeTeam)}-${slug(input.awayTeam)}-${crypto.randomBytes(2).toString("hex")}`;

  return bolaoGames.create({
    code,
    title,
    competition: cleanText(input.competition, "Copa do Mundo"),
    homeTeam: cleanText(input.homeTeam, "Time A"),
    awayTeam: cleanText(input.awayTeam, "Time B"),
    startsAt,
    closesAt,
    status: "open",
    createdBy: normalizeUserLid(sender),
    groupId: input.groupId || null,
    testMode: !!options.testMode,
    minBet: Number(input.minBet || MIN_BET)
  });
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
    homeScore: bet.homeScore,
    awayScore: bet.awayScore,
    score: `${bet.homeScore}x${bet.awayScore}`,
    stake: bet.stake,
    status: bet.status,
    paidAmount: bet.paidAmount || 0,
    placedAt: toIso(bet.placedAt),
    updatedAt: toIso(bet.updatedAt)
  };
}

function statusLabel(status) {
  return {
    open: "Aberto",
    closed: "Fechado",
    result_preview: "Resultado em preview",
    paid: "Pago",
    refunded: "Reembolsado",
    cancelled: "Cancelado"
  }[status] || status;
}

function serializeGame(game, extras = {}) {
  const raw = typeof game.toObject === "function" ? game.toObject() : game;
  const canBet = raw.status === "open" && new Date(raw.closesAt).getTime() > Date.now();
  return {
    id: String(raw._id),
    code: raw.code,
    title: raw.title,
    competition: raw.competition,
    homeTeam: raw.homeTeam,
    awayTeam: raw.awayTeam,
    startsAt: toIso(raw.startsAt),
    closesAt: toIso(raw.closesAt),
    status: raw.status,
    statusLabel: statusLabel(raw.status),
    canBet,
    minBet: raw.minBet || MIN_BET,
    publicLink: buildPanelLink(String(raw._id)),
    result: raw.result?.homeScore !== null && raw.result?.awayScore !== null ? {
      homeScore: raw.result.homeScore,
      awayScore: raw.result.awayScore,
      score: `${raw.result.homeScore}x${raw.result.awayScore}`,
      setAt: toIso(raw.result.setAt)
    } : null,
    payoutPreview: raw.payoutPreview || {},
    testMode: !!raw.testMode,
    ...extras
  };
}

async function getStats(gameIds) {
  if (!gameIds.length) return new Map();
  const rows = await bolaoBets.aggregate([
    {$match: {gameId: {$in: gameIds}, status: "active"}},
    {$group: {_id: "$gameId", pool: {$sum: "$stake"}, bets: {$sum: 1}}}
  ]);
  return new Map(rows.map((row) => [String(row._id), {pool: row.pool || 0, bets: row.bets || 0}]));
}

async function listPanelBolao(sender) {
  const senderLid = normalizeUserLid(sender);
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const games = await bolaoGames
    .find({createdAt: {$gte: since}, status: {$ne: "cancelled"}})
    .sort({startsAt: 1})
    .limit(40)
    .lean();

  const ids = games.map((game) => game._id);
  const [stats, userBets, user, canManage] = await Promise.all([
    getStats(ids),
    ids.length ? bolaoBets.find({gameId: {$in: ids}, userLid: senderLid}).lean() : [],
    users.findOne({userLid: senderLid}).select("dinheiro").lean(),
    isBolaoAdmin(senderLid)
  ]);

  const betMap = new Map(userBets.map((bet) => [String(bet.gameId), bet]));
  return {
    canManage,
    balance: user?.dinheiro || 0,
    games: games.map((game) => {
      const id = String(game._id);
      const stat = stats.get(id) || {pool: 0, bets: 0};
      return serializeGame(game, {
        pool: stat.pool,
        bets: stat.bets,
        userBet: serializeBet(betMap.get(id))
      });
    })
  };
}

async function getPanelBolaoGame(sender, ref) {
  const senderLid = normalizeUserLid(sender);
  const game = await findGame(ref);
  const gameId = game._id;
  const [stats, userBet, canManage, activeBets] = await Promise.all([
    getStats([gameId]),
    bolaoBets.findOne({gameId, userLid: senderLid}).lean(),
    isBolaoAdmin(senderLid),
    bolaoBets.find({gameId, status: {$in: ["active", "paid", "lost", "refunded"]}})
      .sort({paidAmount: -1, stake: -1})
      .limit(60)
      .lean()
  ]);
  const stat = stats.get(String(gameId)) || {pool: 0, bets: 0};
  const showScores = canManage || game.status !== "open";

  return {
    canManage,
    game: serializeGame(game, {
      pool: stat.pool,
      bets: stat.bets,
      userBet: serializeBet(userBet)
    }),
    bets: activeBets.map((bet) => ({
      name: bet.name,
      stake: bet.stake,
      score: showScores ? `${bet.homeScore}x${bet.awayScore}` : null,
      status: bet.status,
      paidAmount: bet.paidAmount || 0
    }))
  };
}

async function placeOrUpdateBet(input) {
  const sender = normalizeUserLid(input.sender);
  const game = await findGame(input.gameId || input.code);
  if (game.status !== "open" || new Date(game.closesAt).getTime() <= Date.now()) {
    throw httpError(409, "apostas fechadas para esse jogo.");
  }

  const score = normalizeScore(input.homeScore, input.awayScore);
  const stake = Math.floor(Number(input.amount || input.stake || 0));
  const minBet = Number(game.minBet || MIN_BET);
  if (!Number.isFinite(stake) || stake < minBet) {
    throw httpError(400, `aposta minima: ${minBet} moedas.`);
  }

  const user = await ensureUser(sender, input.name || "Sem nome");
  const name = user?.name || input.name || "Sem nome";
  const existing = await bolaoBets.findOne({gameId: game._id, userLid: sender}).lean();
  if (existing && existing.status !== "active") throw httpError(409, "essa aposta ja foi encerrada.");

  const previousStake = existing?.stake || 0;
  const delta = stake - previousStake;
  let balance = null;

  if (delta > 0) {
    balance = await updateUserAndCache(sender, {$inc: {dinheiro: -delta}}, {filter: {dinheiro: {$gte: delta}}, upsert: !existing, name});
    if (!balance) throw httpError(402, "saldo insuficiente para essa aposta.");
  }

  if (delta < 0) {
    balance = await updateUserAndCache(sender, {$inc: {dinheiro: Math.abs(delta)}}, {upsert: true, name});
  }

  try {
    const bet = await bolaoBets.findOneAndUpdate(
      {gameId: game._id, userLid: sender},
      {
        $set: {
          gameCode: game.code,
          name,
          groupId: input.groupId || existing?.groupId || null,
          homeScore: score.home,
          awayScore: score.away,
          stake,
          status: "active",
          updatedAt: new Date()
        },
        $setOnInsert: {placedAt: new Date()},
        $inc: {revision: 1}
      },
      {new: true, upsert: true, setDefaultsOnInsert: true}
    );

    if (delta !== 0) {
      await bolaoLedgers.create({
        transactionId: `stake:${game._id}:${sender}:${bet.revision}:${Date.now()}`,
        gameId: game._id,
        gameCode: game.code,
        userLid: sender,
        type: delta > 0 ? "stake" : "stake_adjust",
        amount: -delta,
        meta: {previousStake, stake, score}
      });
    }

    return {bet: serializeBet(bet), balance: balance?.dinheiro ?? null, game: serializeGame(game)};
  } catch (err) {
    if (delta > 0) await updateUserAndCache(sender, {$inc: {dinheiro: delta}}, {upsert: true, name});
    throw err;
  }
}

async function closeGame(ref, sender) {
  await assertBolaoAdmin(sender);
  const game = await findGame(ref);
  if (game.status !== "open") throw httpError(409, "esse jogo nao esta aberto.");
  game.status = "closed";
  await game.save();
  return serializeGame(game);
}

function buildPayout(activeBets, score) {
  const pool = activeBets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);
  const winners = activeBets.filter((bet) => bet.homeScore === score.home && bet.awayScore === score.away);

  if (!winners.length) {
    return {
      pool,
      totalBets: activeBets.length,
      winnerCount: 0,
      totalPayout: pool,
      winners: [],
      refunds: activeBets.map((bet) => ({
        userLid: bet.userLid,
        name: bet.name,
        stake: bet.stake,
        score: `${bet.homeScore}x${bet.awayScore}`,
        total: bet.stake
      }))
    };
  }

  const winnerStake = winners.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);
  const rows = winners.map((bet) => ({
    userLid: bet.userLid,
    name: bet.name,
    stake: bet.stake,
    score: `${bet.homeScore}x${bet.awayScore}`,
    poolShare: Math.floor((pool * bet.stake) / winnerStake),
    bonus: bet.stake,
    total: 0
  }));

  let remainder = pool - rows.reduce((sum, row) => sum + row.poolShare, 0);
  for (let index = 0; remainder > 0 && rows.length; index = (index + 1) % rows.length) {
    rows[index].poolShare += 1;
    remainder -= 1;
  }

  for (const row of rows) row.total = row.poolShare + row.bonus;

  return {
    pool,
    totalBets: activeBets.length,
    winnerCount: rows.length,
    totalPayout: rows.reduce((sum, row) => sum + row.total, 0),
    winners: rows,
    refunds: []
  };
}

async function createResultPreview(ref, sender, scoreInput) {
  await assertBolaoAdmin(sender);
  const game = await findGame(ref);
  if (!["closed", "result_preview"].includes(game.status)) {
    throw httpError(409, "feche o jogo antes de inserir resultado.");
  }

  const score = typeof scoreInput === "string"
    ? parseScoreText(scoreInput)
    : normalizeScore(scoreInput.homeScore ?? scoreInput.home, scoreInput.awayScore ?? scoreInput.away);
  const activeBets = await bolaoBets.find({gameId: game._id, status: "active"}).lean();
  const preview = buildPayout(activeBets, score);

  game.result = {homeScore: score.home, awayScore: score.away, setBy: normalizeUserLid(sender), setAt: new Date()};
  game.payoutPreview = {...preview, generatedAt: new Date()};
  game.status = "result_preview";
  await game.save();
  return serializeGame(game, {pool: preview.pool, bets: preview.totalBets});
}

async function applyCreditOnce({transactionId, game, userLid, name, type, amount, meta}) {
  const inserted = await bolaoLedgers.updateOne(
    {transactionId},
    {$setOnInsert: {
      transactionId,
      gameId: game._id,
      gameCode: game.code,
      userLid,
      type,
      amount,
      status: "applied",
      meta: meta || {},
      createdAt: new Date()
    }},
    {upsert: true}
  );

  if (inserted.upsertedCount > 0) {
    await updateUserAndCache(userLid, {$inc: {dinheiro: amount}}, {upsert: true, name});
    return true;
  }
  return false;
}

async function confirmPayout(ref, sender) {
  await assertBolaoAdmin(sender);
  const game = await findGame(ref);
  if (["paid", "refunded"].includes(game.status)) return serializeGame(game);
  if (game.status !== "result_preview") throw httpError(409, "gere o preview do resultado antes.");

  const activeBets = await bolaoBets.find({gameId: game._id, status: "active"}).lean();
  const winners = new Map((game.payoutPreview?.winners || []).map((winner) => [winner.userLid, winner]));

  if (!activeBets.length || !winners.size) {
    for (const bet of activeBets) {
      await applyCreditOnce({
        transactionId: `refund:${game._id}:${bet.userLid}`,
        game,
        userLid: bet.userLid,
        name: bet.name,
        type: "refund",
        amount: bet.stake,
        meta: {reason: "no_winners"}
      });
      await bolaoBets.updateOne({_id: bet._id, status: "active"}, {$set: {status: "refunded", paidAmount: bet.stake, updatedAt: new Date()}});
    }
    game.status = "refunded";
    game.paidAt = new Date();
    await game.save();
    return serializeGame(game);
  }

  for (const bet of activeBets) {
    const winner = winners.get(bet.userLid);
    if (winner) {
      await applyCreditOnce({
        transactionId: `payout:${game._id}:${bet.userLid}`,
        game,
        userLid: bet.userLid,
        name: bet.name,
        type: "payout",
        amount: winner.total,
        meta: {poolShare: winner.poolShare, bonus: winner.bonus}
      });
      await bolaoBets.updateOne({_id: bet._id, status: "active"}, {$set: {status: "paid", paidAmount: winner.total, updatedAt: new Date()}});
    } else {
      await bolaoBets.updateOne({_id: bet._id, status: "active"}, {$set: {status: "lost", paidAmount: 0, updatedAt: new Date()}});
    }
  }

  game.status = "paid";
  game.paidAt = new Date();
  await game.save();
  return serializeGame(game);
}

async function cancelGame(ref, sender, reason = "cancelado pelo dono") {
  await assertBolaoAdmin(sender);
  const game = await findGame(ref);
  if (["paid", "refunded", "cancelled"].includes(game.status)) throw httpError(409, "esse jogo ja foi encerrado.");

  const activeBets = await bolaoBets.find({gameId: game._id, status: "active"}).lean();
  for (const bet of activeBets) {
    await applyCreditOnce({
      transactionId: `cancel:${game._id}:${bet.userLid}`,
      game,
      userLid: bet.userLid,
      name: bet.name,
      type: "cancel_refund",
      amount: bet.stake,
      meta: {reason}
    });
    await bolaoBets.updateOne({_id: bet._id, status: "active"}, {$set: {status: "cancelled", paidAmount: bet.stake, updatedAt: new Date()}});
  }

  game.status = "cancelled";
  game.cancelReason = reason;
  game.cancelledAt = new Date();
  await game.save();
  return {game: serializeGame(game), refunded: activeBets.length};
}

function buildGroupAnnouncement(game) {
  return `*Bolao da Yuki*

${game.title}
Jogo: ${formatDateTime(game.startsAt)}
Fecha: ${formatDateTime(game.closesAt)}

Placar exato. Minimo: ${game.minBet || MIN_BET} moedas.
Premio: pool dividido entre quem cravar + bonus igual ao valor apostado.

Painel: ${buildPanelLink(String(game._id))}
Comando: ${prefixo || "/"}bolao apostar ${game.code} 2x1 ${game.minBet || MIN_BET}`;
}

async function announceGame(sock, ref, groupId, sender) {
  await assertBolaoAdmin(sender);
  if (!groupId?.endsWith("@g.us")) throw httpError(400, "anuncie dentro de um grupo.");
  const game = await findGame(ref);
  const text = buildGroupAnnouncement(game);
  await sock.sendMessage(groupId, {text});
  return serializeGame(game);
}

module.exports = {
  announceGame,
  buildGroupAnnouncement,
  buildPanelLink,
  cancelGame,
  closeGame,
  confirmPayout,
  createGame,
  createResultPreview,
  findGame,
  formatDateTime,
  formatMoney,
  httpError,
  isBolaoAdmin,
  listPanelBolao,
  getPanelBolaoGame,
  parseGameCreateText,
  parseScoreText,
  placeOrUpdateBet,
  serializeGame
};
