const { users } = require("../../database/models/users");
const { normalizeUserLid } = require("../../utils/normalizeUserLid");

module.exports = {
  name: "saldo",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      await sock.sendMessage(from, { text: espera_pronta }, { quoted: msg });

      const senderLid = normalizeUserLid(sender);

      let userFind = await users.findOne({ userLid: senderLid });

      if (!userFind) {
        userFind = await users.create({
          userLid: senderLid,
          name: msg.pushName || "Sem nome",
          dinheiro: 0
        });
      }

      const saldo = Number(userFind.dinheiro || 0);

      await sock.sendMessage(from, {
        text: `${msg.pushName || "sem nome"}, você tem ${saldo} de saldo.`
      }, { quoted: msg });

    } catch (err) {
      console.error(err);
      await sock.sendMessage(from, { text: erros_prontos }, { quoted: msg });
    }
  }
};
