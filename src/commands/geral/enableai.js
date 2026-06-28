const { isPersonalMode, setPersonalAiEnabled } = require("../../utils/personalMode");

module.exports = {
  name: "enableai",
  categoria: "padrao",
  async execute(sock, msg, from) {
    if (!isPersonalMode()) {
      await sock.sendMessage(from, { text: "Esse comando so funciona no modo pessoal." }, { quoted: msg });
      return;
    }

    const saved = await setPersonalAiEnabled(from, true);
    await sock.sendMessage(from, {
      text: saved
        ? "IA liberada nesse chat. Vou responder so quando fizer sentido."
        : "Nao consegui salvar isso no Redis agora."
    }, { quoted: msg });
  }
};
