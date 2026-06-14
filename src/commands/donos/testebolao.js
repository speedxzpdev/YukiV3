const { buildPanelLink, createGame, formatDateTime, isBolaoAdmin } = require("../../services/bolaoService");

module.exports = {
  name: "testebolao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      if (!(await isBolaoAdmin(sender))) {
        await sock.sendMessage(from, {text: "So dono real da Yuki pode rodar teste de bolao."}, {quoted: msg});
        return;
      }

      if (!from.endsWith("@g.us")) {
        await sock.sendMessage(from, {text: "Use /testebolao dentro do grupo de teste."}, {quoted: msg});
        return;
      }

      const now = Date.now();
      const game = await createGame({
        homeTeam: "Brasil Teste",
        awayTeam: "Yuki FC",
        competition: "Teste interno",
        startsAt: new Date(now + 15 * 60 * 1000),
        closesAt: new Date(now + 10 * 60 * 1000),
        groupId: from,
        minBet: 100
      }, sender, {testMode: true});

      await sock.sendMessage(from, {
        text: `Teste criado.

Codigo: ${game.code}
Fecha: ${formatDateTime(game.closesAt)}
Link: ${buildPanelLink(game.code)}

Postar chamada:
/bolao anunciar ${game.code}

Apostar:
/bolao apostar ${game.code} 2x1 100

Encerrar:
/bolao fechar ${game.code}
/bolao resultado ${game.code} 2x1
/bolao pagar ${game.code}`
      }, {quoted: msg});
    } catch (err) {
      await sock.sendMessage(from, {text: err?.status ? err.message : (erros_prontos || "Falha no teste do bolao.")}, {quoted: msg});
      if (!err?.status) console.error("Erro no /testebolao:", err);
    }
  }
};
