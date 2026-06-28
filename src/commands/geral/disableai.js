const { isPersonalMode, setPersonalAiEnabled } = require("../../utils/personalMode");

module.exports = {
  name: "disableai",
  categoria: "padrao",
  async execute(sock, msg, from) {
    if (!isPersonalMode()) {
      await sock.sendMessage(from, { text: "Esse comando so funciona no modo pessoal." }, { quoted: msg });
      return;
    }

    const saved = await setPersonalAiEnabled(from, false);
    await sock.sendMessage(from, {
      text: saved
        ? "IA desligada nesse chat. Modo quietinho de novo."
        : "Nao consegui salvar isso no Redis agora."
    }, { quoted: msg });
  }
};
