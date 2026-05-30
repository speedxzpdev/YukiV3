const { users } = require("../database/models/users.js");
const { userCache } = require("./hotPathCache");

const FLUSH_INTERVAL_MS = Number(process.env.XP_FLUSH_INTERVAL_MS || 5000);
const pendingXp = new Map();

let flushTimer = null;
let flushing = false;

function addXp(user, quantidade, sock, from, msg) {
  if (!user || !quantidade) return;

  const current = pendingXp.get(user) || {
    quantidade: 0,
    sock,
    from,
    msg
  };

  current.quantidade += quantidade;
  current.sock = sock || current.sock;
  current.from = from || current.from;
  current.msg = msg || current.msg;

  pendingXp.set(user, current);
  scheduleFlush();
}

function scheduleFlush() {
  if (flushTimer) return;

  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushXp("interval");
  }, FLUSH_INTERVAL_MS);

  if (typeof flushTimer.unref === "function") {
    flushTimer.unref();
  }
}

async function flushXp(reason = "manual") {
  if (flushing) return;
  if (pendingXp.size === 0) return;

  flushing = true;

  const snapshot = Array.from(pendingXp.entries());
  pendingXp.clear();

  const startedAt = Date.now();

  try {
    await flushUsersXp(snapshot);

    console.log(`[mongo-xp] flush ${reason}: users=${snapshot.length}, ms=${Date.now() - startedAt}`);
  } catch (err) {
    console.error("[mongo-xp] erro ao gravar xp em lote:", err);

    if (!err.xpWriteDone) {
      requeueSnapshot(snapshot);
    } else {
      console.error("[mongo-xp] xp ja gravado; nao reenfileirando para evitar duplicar pontos.");
    }
  } finally {
    flushing = false;

    if (pendingXp.size > 0) {
      scheduleFlush();
    }
  }
}

function requeueSnapshot(snapshot) {
  for (const [user, payload] of snapshot) {
    const current = pendingXp.get(user) || {
      quantidade: 0,
      sock: payload.sock,
      from: payload.from,
      msg: payload.msg
    };

    current.quantidade += payload.quantidade;
    current.sock = payload.sock || current.sock;
    current.from = payload.from || current.from;
    current.msg = payload.msg || current.msg;

    pendingXp.set(user, current);
  }
}

async function flushUsersXp(snapshot) {
  if (!snapshot.length) return;

  let xpWriteDone = false;
  const payloadByUser = new Map(snapshot);

  try {
    await users.bulkWrite(
      snapshot.map(([user, payload]) => ({
        updateOne: {
          filter: { userLid: user },
          update: {
            $inc: { xp: payload.quantidade },
            $setOnInsert: { userLid: user, name: payload.msg?.pushName || "Sem nome" }
          },
          upsert: true
        }
      })),
      { ordered: false }
    );
    xpWriteDone = true;

    const docs = await users.find({ userLid: { $in: snapshot.map(([user]) => user) } }).lean();
    const levelUps = [];

    for (const doc of docs) {
      userCache.set(doc.userLid, doc);

      if (!doc?.xp || doc.xp <= doc.proximolevel) continue;

      const levelsToAdd = Math.max(
        1,
        Math.floor((doc.xp - doc.proximolevel) / 100) + 1
      );

      levelUps.push({
        doc,
        levelsToAdd,
        nextLevel: (doc.level || 0) + levelsToAdd,
        nextProximoLevel: (doc.proximolevel || 100) + (100 * levelsToAdd)
      });
    }

    if (levelUps.length) {
      await users.bulkWrite(
        levelUps.map(({ doc, levelsToAdd }) => ({
          updateOne: {
            filter: { userLid: doc.userLid },
            update: { $inc: { level: levelsToAdd, proximolevel: 100 * levelsToAdd } }
          }
        })),
        { ordered: false }
      );
    }

    for (const levelUp of levelUps) {
      const payload = payloadByUser.get(levelUp.doc.userLid);
      if (!payload?.sock || !payload?.from) continue;

      const cached = {
        ...levelUp.doc,
        level: levelUp.nextLevel,
        proximolevel: levelUp.nextProximoLevel
      };
      userCache.set(levelUp.doc.userLid, cached);
      try {
        await sendLevelUp(levelUp, payload);
      } catch (err) {
        console.error("[mongo-xp] erro ao enviar aviso de level up:", err);
      }
    }
  } catch (err) {
    err.xpWriteDone = xpWriteDone;
    throw err;
  }
}

async function sendLevelUp(levelUp, payload) {
  await payload.sock.sendMessage(payload.from, { text: "Up!" }, { quoted: payload.msg });

  const pushname = payload.msg?.pushName || "Sem nome";
  const imageXp = `https://zero-two-apis.com.br/api/canvas/levelup2?foto=${encodeURIComponent("https://files.catbox.moe/0ug48m")}&nome=${encodeURIComponent(pushname)}&expnow=${levelUp.doc?.xp}&expall=${levelUp.nextProximoLevel}&level=${levelUp.nextLevel}&fundo=https://files.catbox.moe/b05qkn`;

  const button = [
    { buttonId: `${process.env.PREFIXO}perfil`, buttonText: { displayText: "Ver Perfil ✨" }, type: 1 }
  ];

  await payload.sock.sendMessage(payload.from, {
    image: { url: imageXp },
    caption: `Parabéns ${pushname}🎉 Você acaba de subir de nível🔥`,
    buttons: button
  });
}

process.once("beforeExit", () => {
  if (pendingXp.size > 0) {
    flushXp("beforeExit").catch((err) => {
      console.error("[mongo-xp] erro no flush final:", err);
    });
  }
});

module.exports = addXp;
