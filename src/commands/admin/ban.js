const { numberBot } = require("../../config");
const { canModerateTarget, isOwnerCached } = require("../../utils/dbHelpers");

module.exports = {
  name: "ban",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      const mention =
        msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
        msg.message?.extendedTextMessage?.contextInfo?.participant;

      const metadados = await sock.groupMetadata(from);
      const admins = metadados.participants.filter((p) => p.admin);
      const groupAdmins = admins.flatMap((m) => [m.lid, m.id]).filter(Boolean);
      const isSubOwner = await isOwnerCached(sender);

      if (!groupAdmins.includes(sender) && !isSubOwner) {
        const mensagensTentativaSemPerm = [
          `${msg.pushName}, tu não tem cargo pra isso, mano. Vai brincar de moderador em outro lugar.`,
          `Tentou banir sem permissão. O ego tá grande, mas o poder é zero.`,
          `O cara nem admin é e já quer expulsar os outros... humildade passou longe.`,
          `Sem ser admin e tentando banir? Que fase... vai arrumar o que fazer, campeão.`
        ];
        const msgNoAdmin = mensagensTentativaSemPerm[Math.floor(Math.random() * mensagensTentativaSemPerm.length)];
        await sock.sendMessage(from, { text: msgNoAdmin }, { quoted: msg });
        return;
      }

      if (!mention) {
        await sock.sendMessage(from, { text: "Menciona alguém zé bct." }, { quoted: msg });
        return;
      }

      if (mention.includes(numberBot)) {
        const mensagensBanBot = [
          `Tu tá mesmo tentando me banir? CORAJOSO, hein.`,
          `${msg.pushName}, eu vi tua tentativa patética de me remover. Deixa eu rir rapidinho.`,
          `${msg.pushName}... achou que eu ia sair? Só saio quando o dono quiser, não quando um mortal tenta.`,
          `Se eu quisesse, era eu que te bania. Fica na tua.`,
          `Você tentou me banir e falhou. Parabéns, conseguiu nada.`,
          `Me banir? Eu sou o sistema, não um usuário. Aprende a diferença.`,
          `${msg.pushName}, próxima vez tenta com fé, talvez o milagre aconteça.`,
          `Tu me irritou, mas ainda tô rindo da tua audácia.`
        ];

        const banbotmsg = mensagensBanBot[Math.floor(Math.random() * mensagensBanBot.length)];
        await sock.sendMessage(from, { text: banbotmsg }, { quoted: msg });
        return;
      }
      if (!(await canModerateTarget(sender, mention))) {
        await sock.sendMessage(from, { text: "Esse ai ta acima de tu na hierarquia." }, { quoted: msg });
        return;
      }
      await sock.groupParticipantsUpdate(from, [mention], "remove");
      await sock.sendMessage(from, { text: "Usuário banido com sucesso!" }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(from, { text: erros_prontos }, { quoted: msg });
      console.error(err);
    }
  }
};
