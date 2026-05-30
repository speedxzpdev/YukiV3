const { ensureGroupFromSocket, isOwnerCached } = require("../../utils/dbHelpers");

module.exports = {
  name: "addgroup",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      if(!(await isOwnerCached(sender))) {
        await sock.sendMessage(from, {text: "Comando exclusivo para SubDonos."}, {quoted: msg});
        return;
      }

      const groupLink = args[0];

      if(!groupLink) {
        await sock.sendMessage(from, {text: "Envia um link zé bct"}, {quoted: msg});
        return;
      }

      await sock.sendMessage(from, {text: "entrando no grupo..."}, {quoted: msg});

      const groupId = groupLink.split("https://chat.whatsapp.com/")[1].split("?")[0].trim();
      const acceptInvite = await sock.groupAcceptInvite(groupId);

      await ensureGroupFromSocket(sock, acceptInvite);
      await sock.sendMessage(acceptInvite, {text: `Olá! me chamo Yuki e meu prefixo neste grupo é */* caso queira mudar use */prefixo <prefix>*`}, {quoted: msg});
    } catch(err) {
      const ifErro = String(err);

      if(ifErro.includes("not-authorized")) {
        await sock.sendMessage(from, {text: "Entrada ao grupo não autorizada! Tente mais tarde."}, {quoted: msg});
        return;
      }

      await sock.sendMessage(from, {text: erros_prontos});
      console.error(err);
    }
  }
};
