const { clientRedis } = require("../../lib/redis");
const { cleanCode, loginKey, APPROVED_TTL_SECONDS } = require("../../backend/controllers/user/browserLogin");

module.exports = {
  name: "entrarpainel",
  categoria: "padrao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const code = cleanCode(args[0]);
      if (!code) {
        await bot.reply(from, "Use: /entrarpainel CODIGO");
        return;
      }

      const key = loginKey(code);
      const raw = await clientRedis.get(key);
      if (!raw) {
        await bot.reply(from, "Esse codigo expirou ou nao existe. Gere outro no painel do bolao.");
        return;
      }

      const current = JSON.parse(raw);
      if (current.status === "approved") {
        await bot.reply(from, "Esse codigo ja foi confirmado. Se o painel nao entrou, gere outro codigo.");
        return;
      }

      await clientRedis.set(key, JSON.stringify({
        status: "approved",
        sender,
        name: msg.pushName || "Sem nome",
        approvedAt: Date.now()
      }), {EX: APPROVED_TTL_SECONDS});

      await bot.reply(from, "Pronto. Volta no painel do bolao que eu ja reconheci voce.");
    } catch (err) {
      await bot.reply(from, erros_prontos || "Nao consegui liberar sua entrada no painel.");
      console.error("Erro no /entrarpainel:", err);
    }
  }
};
