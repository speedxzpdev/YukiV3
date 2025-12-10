// commands/meulid.js
module.exports = {
  name: "meulid",

  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    try {
      const rawSender = msg.key.participant || msg.key.remoteJid;

      await sock.sendMessage(
        from,
        { text: `Seu LID é:\n${rawSender}` },
        { quoted: msg }
      );
    } catch (e) {
      console.error("Erro no meulid:", e);
      await sock.sendMessage(from, { text: erros_prontos }, { quoted: msg });
    }
  }
};
