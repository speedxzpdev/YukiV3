const { prefixo } = require("../../config");
const {
  cancelGame,
  confirmPayout,
  createGame,
  createResultPreview,
  formatDateTime,
  formatMoney,
  getCommandStatus,
  getOpenGames,
  isBolaoAdmin,
  parseGameCreateText,
  parseScoreText,
  placeOrUpdateBet,
  updateBolaoGroupConfig
} = require("../../services/bolaoService");
const { reconcileBolaoOnce } = require("../../services/bolaoScheduler");

function commandPrefix() {
  return prefixo || "/";
}

async function sendHelp(sock, msg, from) {
  const p = commandPrefix();
  await sock.sendMessage(from, {
    text: `*Bolao da Yuki*

Usuario:
${p}bolao apostar CODIGO 2x1 500
${p}bolao status CODIGO

Dono:
${p}bolao criar Brasil x Argentina | 2026-06-14 16:00 | Copa
${p}bolao resultado CODIGO 2x1
${p}bolao pagar CODIGO
${p}bolao cancelar CODIGO motivo

Admin de grupo:
${p}bolao config 1
${p}bolao config 0`
  }, {quoted: msg});
}

function previewText(game) {
  const preview = game.payoutPreview || {};
  const winners = preview.winners || [];
  const refunds = preview.refunds || [];

  if (!preview.totalBets) {
    return `Preview gerado para ${game.title}, mas ainda nao existe aposta ativa.`;
  }

  if (!winners.length) {
    return `*Preview do resultado*

${game.title}: ${game.result?.score}
Apostas: ${preview.totalBets}
Pool: ${formatMoney(preview.pool)}

Ninguem cravou. Ao confirmar, a Yuki reembolsa ${refunds.length} apostas.`;
  }

  const top = winners
    .slice(0, 8)
    .map((winner, index) => `${index + 1}. ${winner.name || winner.userLid} - +${formatMoney(winner.total)}`)
    .join("\n");

  return `*Preview do resultado*

${game.title}: ${game.result?.score}
Apostas: ${preview.totalBets}
Pool: ${formatMoney(preview.pool)}
Ganhadores: ${preview.winnerCount}
Pagamento total: ${formatMoney(preview.totalPayout)}

${top}${winners.length > 8 ? "\n..." : ""}`;
}

async function handleCreate(sock, msg, from, args, sender) {
  if (!(await isBolaoAdmin(sender))) {
    await sock.sendMessage(from, {text: "So dono real da Yuki pode criar bolao."}, {quoted: msg});
    return;
  }

  const input = parseGameCreateText(args.slice(1).join(" "));
  const game = await createGame(input, sender);
  await sock.sendMessage(from, {
    text: `Bolao criado.

Codigo: ${game.code}
Jogo: ${game.title}
Abre: ${formatDateTime(game.bettingOpensAt)}
Fecha: ${formatDateTime(game.bettingClosesAt)}

Quando abrir, a Yuki manda nos grupos ativos com bolao ligado.`
  }, {quoted: msg});

  await reconcileBolaoOnce(sock);
}

async function handleBet(sock, msg, from, args, sender) {
  const code = args[1];
  const scoreText = args[2];
  const amount = Number(args[3]);

  if (!code || !scoreText || !amount) {
    await sock.sendMessage(from, {text: `Use: ${commandPrefix()}bolao apostar CODIGO 2x1 500`}, {quoted: msg});
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
    text: `Bilhete confirmado.

Jogo: ${result.game.title}
Placar: ${result.bet.score}
Valor: ${formatMoney(result.bet.stake)} moedas

Voce pode editar ate fechar, usando o mesmo comando.`
  }, {quoted: msg});
}

async function handleStatus(sock, msg, from, args) {
  const ref = args[1];
  if (!ref) {
    const games = await getOpenGames();
    if (!games.length) {
      await sock.sendMessage(from, {text: "Nenhum bolao aberto agora."}, {quoted: msg});
      return;
    }

    const text = games
      .map((game) => `${game.code} - ${game.title} - fecha ${formatDateTime(game.bettingClosesAt)}`)
      .join("\n");
    await sock.sendMessage(from, {text: `Boloes abertos:\n${text}`}, {quoted: msg});
    return;
  }

  const { game, bets } = await getCommandStatus(ref);
  const showBets = ["closed", "awaiting_result", "result_pending_confirmation", "paid", "refunded"].includes(game.status);
  const betText = showBets && bets.length
    ? `\n\nApostas:\n${bets.slice(0, 8).map((bet) => `${bet.name}: ${bet.score} (${formatMoney(bet.stake)})`).join("\n")}`
    : "";

  await sock.sendMessage(from, {
    text: `*${game.title}*
Codigo: ${game.code}
Status: ${game.statusLabel}
Jogo: ${formatDateTime(game.startsAt)}
Fecha: ${formatDateTime(game.bettingClosesAt)}
Pool: ${formatMoney(game.pool || 0)}
Apostas: ${game.bets || 0}${betText}`
  }, {quoted: msg});
}

async function handleResult(sock, msg, from, args, sender) {
  if (!(await isBolaoAdmin(sender))) {
    await sock.sendMessage(from, {text: "So dono real da Yuki pode fechar resultado."}, {quoted: msg});
    return;
  }

  const code = args[1];
  const scoreText = args[2];
  if (!code || !scoreText) {
    await sock.sendMessage(from, {text: `Use: ${commandPrefix()}bolao resultado CODIGO 2x1`}, {quoted: msg});
    return;
  }

  const game = await createResultPreview(code, sender, scoreText);
  const buttons = [
    {buttonId: `${commandPrefix()}bolao pagar ${game.code}`, buttonText: {displayText: "Confirmar pagamento"}, type: 1}
  ];

  await sock.sendMessage(from, {
    text: `${previewText(game)}

Confirme apenas se o placar estiver certo.`,
    footer: "Modo seguro: nada e pago antes da confirmacao.",
    buttons
  }, {quoted: msg});
}

async function handlePay(sock, msg, from, args, sender) {
  if (!(await isBolaoAdmin(sender))) {
    await sock.sendMessage(from, {text: "So dono real da Yuki pode pagar bolao."}, {quoted: msg});
    return;
  }

  const code = args[1];
  if (!code) {
    await sock.sendMessage(from, {text: `Use: ${commandPrefix()}bolao pagar CODIGO`}, {quoted: msg});
    return;
  }

  const game = await confirmPayout(code, sender);
  await reconcileBolaoOnce(sock);

  await sock.sendMessage(from, {
    text: `Bolao encerrado.

${game.title}
Status: ${game.statusLabel}
Pool: ${formatMoney(game.payoutPreview?.pool || 0)}
Ganhadores: ${game.payoutPreview?.winnerCount || 0}`
  }, {quoted: msg});
}

async function handleCancel(sock, msg, from, args, sender) {
  if (!(await isBolaoAdmin(sender))) {
    await sock.sendMessage(from, {text: "So dono real da Yuki pode cancelar bolao."}, {quoted: msg});
    return;
  }

  const code = args[1];
  const reason = args.slice(2).join(" ") || "cancelado pelo dono";
  if (!code) {
    await sock.sendMessage(from, {text: `Use: ${commandPrefix()}bolao cancelar CODIGO motivo`}, {quoted: msg});
    return;
  }

  const result = await cancelGame(code, sender, reason);
  await sock.sendMessage(from, {
    text: `Bolao cancelado.

${result.game.title}
Reembolsos: ${result.refunded}`
  }, {quoted: msg});
}

async function handleConfig(sock, msg, from, args, sender) {
  if (!from.endsWith("@g.us")) {
    await sock.sendMessage(from, {text: "Use essa config dentro de um grupo."}, {quoted: msg});
    return;
  }

  const value = String(args[1] || "").toLowerCase();
  if (!["0", "1", "on", "off", "ativar", "desativar"].includes(value)) {
    await sock.sendMessage(from, {text: `Use: ${commandPrefix()}bolao config 1 ou ${commandPrefix()}bolao config 0`}, {quoted: msg});
    return;
  }

  const enabled = ["1", "on", "ativar"].includes(value);
  const group = await updateBolaoGroupConfig(sock, from, sender, enabled);
  await sock.sendMessage(from, {
    text: `Bolao ${group.bolao ? "ativado" : "desativado"} em ${group.name || "este grupo"}.`
  }, {quoted: msg});
}

module.exports = {
  name: "bolao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const action = String(args[0] || "status").toLowerCase();

      if (["help", "ajuda"].includes(action)) return sendHelp(sock, msg, from);
      if (action === "criar") return handleCreate(sock, msg, from, args, sender);
      if (["apostar", "aposta"].includes(action)) return handleBet(sock, msg, from, args, sender);
      if (["status", "ver"].includes(action)) return handleStatus(sock, msg, from, args);
      if (["resultado", "result"].includes(action)) return handleResult(sock, msg, from, args, sender);
      if (["pagar", "confirmar"].includes(action)) return handlePay(sock, msg, from, args, sender);
      if (["cancelar", "cancel"].includes(action)) return handleCancel(sock, msg, from, args, sender);
      if (["config", "grupo"].includes(action)) return handleConfig(sock, msg, from, args, sender);

      return sendHelp(sock, msg, from);
    } catch (err) {
      const status = err?.status || 500;
      const text = status < 500 ? err.message : (erros_prontos || "Deu ruim no bolao.");
      await sock.sendMessage(from, {text}, {quoted: msg});
      if (status >= 500) console.error("Erro no comando /bolao:", err);
    }
  }
};
