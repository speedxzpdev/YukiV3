const { prefixo } = require("../../config");
const {
  announceGame,
  buildPanelLink,
  cancelGame,
  closeGame,
  confirmPayout,
  createGame,
  createResultPreview,
  formatDateTime,
  formatMoney,
  isBolaoAdmin,
  listPanelBolao,
  parseGameCreateText,
  parseScoreText,
  placeOrUpdateBet
} = require("../../services/bolaoService");

function pfx() {
  return prefixo || "/";
}

async function help(sock, msg, from) {
  await sock.sendMessage(from, {
    text: `*Bolao da Yuki*

Usuario:
${pfx()}bolao
${pfx()}bolao apostar CODIGO 2x1 100

Dono:
${pfx()}bolao criar Brasil x Argentina | 2026-06-14 16:00 | Copa
${pfx()}bolao anunciar CODIGO
${pfx()}bolao fechar CODIGO
${pfx()}bolao resultado CODIGO 2x1
${pfx()}bolao pagar CODIGO
${pfx()}bolao cancelar CODIGO motivo`
  }, {quoted: msg});
}

function previewText(game) {
  const preview = game.payoutPreview || {};
  if (!preview.totalBets) {
    return `Preview gerado para ${game.title}, mas nao tem aposta ativa.`;
  }

  if (!preview.winnerCount) {
    return `*Preview do bolao*

${game.title}: ${game.result?.score}
Apostas: ${preview.totalBets}
Pool: ${formatMoney(preview.pool)}

Ninguem cravou. Confirmando, a Yuki reembolsa geral.`;
  }

  const winners = (preview.winners || [])
    .slice(0, 8)
    .map((winner, index) => `${index + 1}. ${winner.name} - +${formatMoney(winner.total)}`)
    .join("\n");

  return `*Preview do bolao*

${game.title}: ${game.result?.score}
Apostas: ${preview.totalBets}
Pool: ${formatMoney(preview.pool)}
Ganhadores: ${preview.winnerCount}
Pagamento: ${formatMoney(preview.totalPayout)}

${winners}`;
}

async function listGames(sock, msg, from, sender) {
  const data = await listPanelBolao(sender);
  const games = data.games.slice(0, 8);
  if (!games.length) {
    await sock.sendMessage(from, {text: "Nenhum bolao cadastrado agora."}, {quoted: msg});
    return;
  }

  await sock.sendMessage(from, {
    text: games.map((game) =>
      `${game.code} - ${game.title}\nStatus: ${game.statusLabel}\nFecha: ${formatDateTime(game.closesAt)}\nPool: ${formatMoney(game.pool || 0)}`
    ).join("\n\n")
  }, {quoted: msg});
}

async function handleCreate(sock, msg, from, args, sender) {
  if (!(await isBolaoAdmin(sender))) {
    await sock.sendMessage(from, {text: "So dono real da Yuki pode criar bolao."}, {quoted: msg});
    return;
  }

  const input = parseGameCreateText(args.slice(1).join(" "));
  const game = await createGame({...input, groupId: from.endsWith("@g.us") ? from : null}, sender);
  await sock.sendMessage(from, {
    text: `Bolao criado.

Codigo: ${game.code}
Jogo: ${game.title}
Fecha: ${formatDateTime(game.closesAt)}
Link: ${buildPanelLink(game.code)}

Para postar no grupo:
${pfx()}bolao anunciar ${game.code}`
  }, {quoted: msg});
}

async function handleAnnounce(sock, msg, from, args, sender) {
  const code = args[1];
  if (!code) {
    await sock.sendMessage(from, {text: `Use: ${pfx()}bolao anunciar CODIGO`}, {quoted: msg});
    return;
  }

  await announceGame(sock, code, from, sender);
}

async function handleBet(sock, msg, from, args, sender) {
  const code = args[1];
  const scoreText = args[2];
  const amount = Number(args[3]);

  if (!code || !scoreText || !amount) {
    await sock.sendMessage(from, {text: `Use: ${pfx()}bolao apostar CODIGO 2x1 100`}, {quoted: msg});
    return;
  }

  const score = parseScoreText(scoreText);
  const result = await placeOrUpdateBet({
    gameId: code,
    sender,
    name: msg.pushName || "Sem nome",
    groupId: from.endsWith("@g.us") ? from : null,
    homeScore: score.home,
    awayScore: score.away,
    amount
  });

  await sock.sendMessage(from, {
    text: `Bilhete salvo.

${result.game.title}
Placar: ${result.bet.score}
Valor: ${formatMoney(result.bet.stake)} moedas

Da para editar ate fechar, usando o mesmo comando.`
  }, {quoted: msg});
}

async function handleClose(sock, msg, from, args, sender) {
  const game = await closeGame(args[1], sender);
  await sock.sendMessage(from, {text: `Bolao fechado: ${game.title}`}, {quoted: msg});
}

async function handleResult(sock, msg, from, args, sender) {
  const code = args[1];
  const score = args[2];
  if (!code || !score) {
    await sock.sendMessage(from, {text: `Use: ${pfx()}bolao resultado CODIGO 2x1`}, {quoted: msg});
    return;
  }

  const game = await createResultPreview(code, sender, score);
  await sock.sendMessage(from, {
    text: `${previewText(game)}

Se estiver certo:
${pfx()}bolao pagar ${game.code}`
  }, {quoted: msg});
}

async function handlePay(sock, msg, from, args, sender) {
  const game = await confirmPayout(args[1], sender);
  await sock.sendMessage(from, {
    text: `Bolao encerrado.

${game.title}
Status: ${game.statusLabel}
Pool: ${formatMoney(game.payoutPreview?.pool || 0)}
Ganhadores: ${game.payoutPreview?.winnerCount || 0}`
  }, {quoted: msg});
}

async function handleCancel(sock, msg, from, args, sender) {
  const code = args[1];
  const reason = args.slice(2).join(" ") || "cancelado pelo dono";
  const result = await cancelGame(code, sender, reason);
  await sock.sendMessage(from, {
    text: `Bolao cancelado.

${result.game.title}
Reembolsos: ${result.refunded}`
  }, {quoted: msg});
}

module.exports = {
  name: "bolao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const action = String(args[0] || "listar").toLowerCase();
      if (["help", "ajuda"].includes(action)) return help(sock, msg, from);
      if (["listar", "lista", "status"].includes(action)) return listGames(sock, msg, from, sender);
      if (action === "criar") return handleCreate(sock, msg, from, args, sender);
      if (["anunciar", "abrir"].includes(action)) return handleAnnounce(sock, msg, from, args, sender);
      if (["apostar", "aposta"].includes(action)) return handleBet(sock, msg, from, args, sender);
      if (action === "fechar") return handleClose(sock, msg, from, args, sender);
      if (["resultado", "result"].includes(action)) return handleResult(sock, msg, from, args, sender);
      if (["pagar", "confirmar"].includes(action)) return handlePay(sock, msg, from, args, sender);
      if (["cancelar", "cancel"].includes(action)) return handleCancel(sock, msg, from, args, sender);
      return help(sock, msg, from);
    } catch (err) {
      const status = err?.status || 500;
      await sock.sendMessage(from, {text: status < 500 ? err.message : (erros_prontos || "Deu ruim no bolao.")}, {quoted: msg});
      if (status >= 500) console.error("Erro no /bolao:", err);
    }
  }
};
