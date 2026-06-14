const crypto = require("crypto");
const { clientRedis } = require("../../../lib/redis");
const { numberBotJid } = require("../../../config");
const { issueSession } = require("../../services/authSession");

const LOGIN_TTL_SECONDS = 10 * 60;
const APPROVED_TTL_SECONDS = 2 * 60;

function loginKey(code) {
  return `panelBrowserLogin:${code}`;
}

function cleanCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function createUniqueCode() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = crypto.randomInt(100000, 999999).toString();
    if (!(await clientRedis.exists(loginKey(code)))) return code;
  }

  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function start(req, res) {
  try {
    const code = await createUniqueCode();
    const payload = {
      status: "pending",
      createdAt: Date.now()
    };

    await clientRedis.set(loginKey(code), JSON.stringify(payload), {EX: LOGIN_TTL_SECONDS});

    const text = `/entrarpainel ${code}`;
    const botNumber = String(numberBotJid || "").split("@")[0];
    const whatsappUrl = botNumber
      ? `https://wa.me/${botNumber}?text=${encodeURIComponent(text)}`
      : null;

    res.status(201).json({
      code,
      expiresIn: LOGIN_TTL_SECONDS,
      message: text,
      whatsappUrl
    });
  } catch (err) {
    res.status(500).json({error: "nao consegui gerar o codigo de entrada."});
    console.error(err);
  }
}

async function status(req, res) {
  try {
    const code = cleanCode(req.params.code);
    const raw = code ? await clientRedis.get(loginKey(code)) : null;
    if (!raw) {
      res.status(404).json({error: "codigo expirado. gere outro no painel."});
      return;
    }

    const data = JSON.parse(raw);
    if (data.status !== "approved" || !data.sender) {
      res.status(200).json({status: "pending"});
      return;
    }

    issueSession(res, data.sender);
    await clientRedis.del(loginKey(code));
    res.status(200).json({status: "authenticated"});
  } catch (err) {
    res.status(500).json({error: "nao consegui concluir a entrada."});
    console.error(err);
  }
}

module.exports = {
  APPROVED_TTL_SECONDS,
  cleanCode,
  loginKey,
  start,
  status
};
