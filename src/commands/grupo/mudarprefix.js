const { ensureGroup, getGroupPermission, updateGroupAndCache } = require("../../utils/dbHelpers");

module.exports = {
  name: "alterarprefixo",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const prefixEscolhido = args[0];
      const { metadata, allowed } = await getGroupPermission(sock, from, sender || msg.key.participant);

      if (!allowed) {
        await sock.sendMessage(from, {text: "Só quem pode mudar o prefixo é um admin!"}, {quoted: msg});
        return;
      }

      await ensureGroup(from, metadata);

      if (!prefixEscolhido) {
        await sock.sendMessage(from, {text: "Cadê o prefixo? Zé bct"}, {quoted: msg});
        return;
      }

      if (prefixEscolhido.length > 1) {
        await sock.sendMessage(from, {text: "Passou de 1 caractere porra."}, {quoted: msg});
        return;
      }

      await sock.sendMessage(from, {text: "Alterando prefixo..."}, {quoted: msg});
      await updateGroupAndCache(from, {$set: {"configs.prefixo": prefixEscolhido}}, {metadata});
      await sock.sendMessage(from, {text: `Prefixo alterado para: \`${prefixEscolhido}\``}, {quoted: msg});
    } catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
};
