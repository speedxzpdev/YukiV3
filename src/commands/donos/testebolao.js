const { createGame, formatDateTime, isBolaoAdmin } = require("../../services/bolaoService");
const { reconcileBolaoOnce } = require("../../services/bolaoScheduler");
const { ensureGroup } = require("../../utils/dbHelpers");

module.exports = {
  name: "testebolao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      if (!(await isBolaoAdmin(sender))) {
        await sock.sendMessage(from, {text: "So dono real da Yuki pode rodar teste de bolao."}, {quoted: msg});
        return;
      }

      if (!from.endsWith("@g.us")) {
        await sock.sendMessage(from, {text: "Use /testebolao dentro do grupo que vai receber o teste."}, {quoted: msg});
        return;
      }

      let metadata = {};
      try {
        metadata = await sock.groupMetadata(from);
        await ensureGroup(from, metadata);
      } catch (err) {
        console.error("[testebolao] nao consegui atualizar metadata:", err?.message || err);
      }

      const now = Date.now();
      const game = await createGame({
        homeTeam: "Brasil Teste",
        awayTeam: "Yuki FC",
        competition: "Simulacao interna",
        startsAt: new Date(now + 3 * 60 * 1000),
        bettingOpensAt: new Date(now - 1000),
        bettingClosesAt: new Date(now + 90 * 1000),
        reminderAt: new Date(now + 45 * 1000),
        resultPromptAt: new Date(now + 4 * 60 * 1000),
        targetGroupIds: [from],
        source: "test"
      }, sender, {testMode: true});

      await reconcileBolaoOnce(sock);

      await sock.sendMessage(from, {
        text: `Teste do bolao criado para este grupo.

Codigo: ${game.code}
Fecha: ${formatDateTime(game.bettingClosesAt)}

Teste uma aposta:
/bolao apostar ${game.code} 2x1 100

Depois do fechamento, teste:
/bolao resultado ${game.code} 2x1
/bolao pagar ${game.code}`
      }, {quoted: msg});
    } catch (err) {
      await sock.sendMessage(from, {text: err?.status ? err.message : (erros_prontos || "Falha no teste do bolao.")}, {quoted: msg});
      if (!err?.status) console.error("Erro no /testebolao:", err);
    }
  }
};
