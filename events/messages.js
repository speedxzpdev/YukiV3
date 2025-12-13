// events/messages.js
const { prefixo } = require("../config");
const tiktokDl = require("../utils/tiktok");
const connectDB = require("../database/index"); // mantido para referência (não chamamos aqui)
const similarityCmd = require("../utils/similaridadeCmd");
const { users } = require("../database/models/users");
const { donos } = require("../database/models/donos");
const { rankativos } = require("../database/models/rankativos");
const { grupos } = require("../database/models/grupos");
const instaDl = require("../utils/instagram");

module.exports = (sock, commandsMap, erros_prontos, espera_pronta) => {
  sock.ev.on("messages.upsert", async (m) => {
    try {
      const msg = m.messages?.[0];
      if (!msg) return;

      // marca como lido (opcional)
      try { await sock.readMessages([msg.key]); } catch (e) {}

      // Ignora mensagens antigas (backlog) — evita executar comandos quando o bot estava offline
      if (!msg.key.fromMe && msg.messageTimestamp) {
        const now = Date.now() / 1000;
        const msgTime = Number(msg.messageTimestamp || 0);

        // mensagens mais velhas que 30s são ignoradas
        if (now - msgTime > 30) return;
      }

      const from = msg?.key.remoteJid || msg?.key.remoteJidAlt;
      const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const sender = msg.key.participant || msg.key.remoteJid;

      // só pra garantir: se o bot começar a responder em DMs sem permissão, você controla com a lista de donos
      //const doninhos = await donos.findOne({ userLid: sender });

      // se não for grupo e não for dono, ignora
      //if (!from?.endsWith?.("@g.us") && !doninhos) return;

      // garante registro do grupo no DB
      if (!await grupos.findOne({ groupId: from })) {
        await grupos.create({ groupId: from });
      }

      const groupDBInfo = await grupos.findOne({ groupId: from });

      // menção ao bot -> responde com sticker aleatório
      if (mention.includes("221856653123760@lid")) {
        const figList = [
          "https://files.catbox.moe/99k6q0.webp",
          "https://files.catbox.moe/866c5t.webp",
          "https://files.catbox.moe/k1xm6g.webp"
        ];
        const figrandom = figList[Math.floor(Math.random() * figList.length)];
        await sock.sendMessage(from, { sticker: { url: figrandom } }, { quoted: msg });
      }

      // garante usuário no DB
      const userLid = msg.key.participant || msg.key.remoteJid;
      if (!await users.findOne({ userLid })) {
        await users.create({ userLid });
      }

      // contabiliza atividade
      try {
        await rankativos.updateOne(
          { userLid, from: from },
          { $inc: { msg: 1 } },
          { upsert: true }
        );
      } catch (e) { /* não trava a execução se DB estiver com problema */ }

      const body =
        (msg.message?.conversation) ||
        (msg.message?.extendedTextMessage?.text) ||
        (msg.message?.imageMessage?.caption) ||
        (msg.message?.documentMessage?.caption) ||
        "";

      // auto-replies por grupo
      const groupReply = await grupos.findOne({ groupId: from });
      if (groupReply && groupReply.configs && groupReply.configs.autoReply === true) {
        const bodyCase = (body || "").toLowerCase();
        if (bodyCase.includes("bom dia")) {
          await sock.sendMessage(from, { text: `Bom dia, ${msg.pushName}! Tudo bem?` }, { quoted: msg });
        }
        if (bodyCase.includes("boa tarde")) {
          await sock.sendMessage(from, { text: `Boa tarde, Lindão! Uma hora dessa, assistir um bleach é uma boa.` }, { quoted: msg });
        }
        if (bodyCase.includes("boa noite")) {
          await sock.sendMessage(from, { text: `Boa noite, meu fio. Vá dormir, vá` }, { quoted: msg });
        }
      }

      // consulta prefixo atual
      if (body.startsWith("prefixo")) {
        await sock.sendMessage(from, { text: `O prefixo atual deste grupo é: \`${groupDBInfo.configs.prefixo}\`` });
      }

      // enlaces (tiktok / instagram)
      if (body.startsWith("https://vt.tiktok.com/")) {
        tiktokDl(sock, msg, from, body, erros_prontos, espera_pronta);
      }
      if (body.startsWith("https://www.instagram.com")) {
        instaDl(sock, msg, from, body, erros_prontos, espera_pronta);
      }

      // comandos
      if (body.startsWith(prefixo)) {
        const args = body.slice(prefixo.length).trim().split(/ +/);
        const commandName = (args.shift() || "").toLowerCase();
        const commandGet = commandsMap.get(commandName);

        if (!commandGet) {
          const commandNameList = Array.from(commandsMap.keys());
          const similarity = similarityCmd(commandNameList, commandName);

          if (similarity.similarity < 30) {
            const mensagensCmdInvalido = [
              `${msg.pushName}... procurei nessa merda toda e não achei esse comando!`,
              `${msg.pushName}... procurei pela PORRA dos meus comandos inteiros e não achei nada! Para de inventar moda, caralho!`,
              `${msg.pushName}, tu tá drogado? Esse comando nem existe, porra.`,
              `${msg.pushName}... que porra é essa que tu digitou? Meu cérebro eletrônico bugou.`,
              `${msg.pushName}, tentei entender teu comando e só achei vergonha.`
            ];
            const cmdInvalidMsg = mensagensCmdInvalido[Math.floor(Math.random() * mensagensCmdInvalido.length)];
            await sock.sendMessage(from, { text: cmdInvalidMsg }, { quoted: msg });
            return;
          }

          await sock.sendMessage(from, { text: `😅 Eita, ${msg.pushName}! Quis dizer: "${prefixo}${similarity.sugest}"? Similaridade: ${similarity.similarity}%` }, { quoted: msg });
          return;
        }

        // executa comando
        try {
          await commandGet.execute(sock, msg, from, args, erros_prontos, espera_pronta);
          await rankativos.updateOne(
            { userLid, from: from },
            { $inc: { cmdUsados: 1 } },
            { upsert: true }
          );
        } catch (cmdErr) {
          console.error("Erro ao executar comando:", cmdErr);
          await sock.sendMessage(from, { text: erros_prontos }, { quoted: msg });
        }
      }

    } catch (err) {
      console.error("Erro no handler de mensagens:", err);
    }
  });
};
