const axios = require("axios");
const path = require("path");
const { ensureUser } = require("../../utils/dbHelpers");

module.exports = {
  name: "perfil",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta, bot, sender) {
    try {
      await sock.sendMessage(from, {text: espera_pronta}, {quoted: msg});

      const buttons = [
        {buttonId: `${process.env.PREFIXO}xp`, buttonText: {displayText: "VER XP💖"}, type: 1},
        {buttonId: `${process.env.PREFIXO}waifus`, buttonText: {displayText: "ver waifus"}, type: 1}
      ];

      const statusPromise = axios.get(process.env.URL_BACKEND + `/music?user=${sender}`).catch((err) => {
        console.log(err);
        return undefined;
      });

      const profilePromise = sock.profilePictureUrl(sender, "image").catch(() => null);
      const userSender = await ensureUser(sender, msg.pushName || "Sem nome");
      const [status, senderProfile] = await Promise.all([statusPromise, profilePromise]);
      const dataStatus = status?.data;

      const vencimentoMs = userSender?.vencimentoVip - Date.now();
      const vencimentoDias = Math.max(0, Math.ceil(vencimentoMs / (24 * 60 * 60 * 1000)));

      const infos = `*User:* @${userSender.userLid.split("@")[0]}
*Criado em:* ${userSender.registro.toLocaleDateString("pt-BR")}
*Bio:* ${userSender.bio}
*Status*: ${`Ouvindo ${dataStatus?.name ?? "nada"} - ${dataStatus?.artistas?.join(" ") ?? ""}` || "Usando a Yuki!"}
*Vip:* ${vencimentoDias || 0} dias - ${userSender?.vencimentoVip ? "Vence em " + userSender.vencimentoVip.toLocaleDateString("pt-BR") : "Vencido!"}
*Modo sem prefixo:* ${userSender?.prefixo ? "Desativado" : "Ativado"}
*Namorado(a):* ${ userSender?.casal?.parceiro ? `@${userSender?.casal?.parceiro?.split("@")[0]}
*Desde:* ${userSender?.casal?.pedido.toLocaleDateString("pt-BR")}💕` : "nenhum"}
*Level:* ${userSender?.level}
*Xp:* ${userSender?.xp}
*Xp para o próximo nivel:* ${userSender?.proximolevel}
*Dinheiro:* ${userSender.dinheiro}
*Quantidade waifus:* ${userSender.waifus.length}
*Comandos usados:* ${userSender.cmdCount}
*Downloads:* ${userSender.donwloads}
*Figurinhas:* ${userSender.figurinhas}
`;

      const assetsPast = "../../assets/images";
      const icons = [`${assetsPast}/yuki.jpg`, `${assetsPast}/yuki2.jpg`, `${assetsPast}/yuki3.jpg`, `${assetsPast}/yuki4.jpg`, `${assetsPast}/yuki5.jpg`];
      const imgsRandom = icons[Math.floor(Math.random() * icons.length)];

      await sock.sendMessage(from, {
        image: {url: senderProfile ? senderProfile : path.join(__dirname ,imgsRandom)},
        caption: infos,
        mentions: [sender, ...(userSender?.casal?.parceiro ? [userSender.casal.parceiro] : [])],
        buttons: buttons
      }, {quoted: msg});
    } catch(err) {
      await sock.sendMessage(from, {text: erros_prontos}, {quoted: msg});
      console.error(err);
    }
  }
};
