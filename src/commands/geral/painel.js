const crypto = require("crypto");
const { clientRedis } = require("../../lib/redis.js");

async function sendPrivatePanelLink(sock, msg, sender, text) {
  const candidates = [
    msg?.key?.participant,
    msg?.key?.participantLid,
    msg?.key?.senderLid,
    sender
  ].filter((jid, index, list) => jid && !jid.endsWith("@g.us") && list.indexOf(jid) === index);

  for (const jid of candidates) {
    try {
      await sock.sendMessage(jid, {text});
      return jid;
    } catch(err) {
      console.error(`Erro ao enviar painel no privado para ${jid}:`, err);
    }
  }

  throw new Error("Nao foi possivel enviar o link do painel no privado.");
}

module.exports = {
  name: "painel",
  categoria: "padrao",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const baseUrl = process.env.URL_BACKEND;

      if(!baseUrl) {
        await bot.reply(from, "URL do painel nao configurada.");
        return;
      }

      const existeToken = await clientRedis.exists(`userToken:${sender}`);

      if(existeToken) {
        await bot.reply(from, "Voce ja tem um link pendente no privado. Ele expira em 5 minutos.");
        return;
      }

      const msgEspera = await bot.reply(from, "Gerando link do painel...");
      const token = crypto.randomBytes(32).toString("hex");

      await clientRedis.set(`token:${token}`, sender, {EX: 300});
      await clientRedis.set(`userToken:${sender}`, token, {EX: 300});

      const url = new URL("/painel", baseUrl);
      url.searchParams.set("token", token);

      try {
        await sendPrivatePanelLink(sock, msg, sender, `Seu painel da Yuki: ${url.toString()}\n\nEsse link expira em 5 minutos e funciona uma vez so. Nao passe pra ninguem.`);
        await bot.editReply(from, msgEspera.key, "Link do painel enviado no seu privado!");
      } catch(err) {
        await clientRedis.del([`token:${token}`, `userToken:${sender}`]);
        await bot.editReply(from, msgEspera.key, "Nao consegui enviar o link no seu privado. Me chama no privado uma vez e tenta /painel de novo.");
        err.panelDeliveryHandled = true;
        throw err;
      }
    } catch(err) {
      if(!err?.panelDeliveryHandled) {
        await bot.reply(from, erros_prontos);
      }
      console.error(err);
    }
  }
};
