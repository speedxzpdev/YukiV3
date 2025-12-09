// commands/toimg.js
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { exec, execSync } = require("child_process");
const util = require("util");
const execP = util.promisify(exec);
const fs = require("fs");
const path = require("path");

const FFMPEG_DIR = "C:/ffmpeg/bin"; // <--- ajuste aqui se precisar
const FFMPEG_BIN = `"${path.join(FFMPEG_DIR, "ffmpeg.exe")}"`;
const FFPROBE_BIN = `"${path.join(FFMPEG_DIR, "ffprobe.exe")}"`;

const OUT_FPS = 10; // <<-- taxa de frames de saída (corrige speed-up)

async function which(bin) {
  try {
    if (process.platform === "win32") {
      const { stdout } = await execP(`where ${bin}`);
      return stdout.split(/\r?\n/)[0].trim();
    } else {
      const { stdout } = await execP(`which ${bin}`);
      return stdout.split(/\r?\n/)[0].trim();
    }
  } catch {
    return null;
  }
}

function safeUnlink(p) {
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) { /* ignore */ }
}

async function run(cmd, opts = {}) {
  try {
    const { stdout, stderr } = await execP(cmd, { maxBuffer: 1024 * 1024 * 64, ...opts });
    return { ok: true, stdout: stdout?.toString() || "", stderr: stderr?.toString() || "" };
  } catch (e) {
    return { ok: false, stdout: e.stdout?.toString() || "", stderr: e.stderr?.toString() || (e.message || ""), error: e };
  }
}

module.exports = {
  name: "toimg",
  async execute(sock, msg, from, args, erros_prontos, espera_pronta) {
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const sticker = quotedMsg?.stickerMessage;

    if (!sticker) {
      await sock.sendMessage(from, { text: "Responde um sticker, porra." }, { quoted: msg });
      return;
    }

    await sock.sendMessage(from, { text: espera_pronta }, { quoted: msg });

    const tempDir = path.join(__dirname, "..", "assets", "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const ts = Date.now();
    const base = path.join(tempDir, `sticker_${ts}`);
    const inputWebp = `${base}.webp`;
    const pngOut = `${base}.png`;
    const mp4Out = `${base}.mp4`;
    const framePrefix = path.join(tempDir, `frames_${ts}_`);
    const webmTry = `${base}.webm`;

    try {
      // download
      const buffer = await downloadMediaMessage({ message: quotedMsg }, "buffer", {}, { reuploadRequest: sock.updateMediaMessage });
      fs.writeFileSync(inputWebp, buffer);

      // quick try: ffmpeg direct (large probe) — força fps de saída
      const tryA = `${FFMPEG_BIN} -y -analyzeduration 200M -probesize 200M -i "${inputWebp}" -filter:v fps=${OUT_FPS} -vcodec libx264 -pix_fmt yuv420p -crf 23 -preset veryfast -movflags +faststart "${mp4Out}"`;
      let res = await run(tryA);
      if (res.ok && fs.existsSync(mp4Out)) {
        const vid = fs.readFileSync(mp4Out);
        await sock.sendMessage(from, { video: vid, caption: "" }, { quoted: msg });
        return;
      } else {
        console.log("Anim attempt A failed:", res.stderr || res.error);
      }

      // try forcing demuxer: -f webp (ainda força fps de saída)
      const tryB = `${FFMPEG_BIN} -y -analyzeduration 200M -probesize 200M -f webp -i "${inputWebp}" -filter:v fps=${OUT_FPS} -vcodec libx264 -pix_fmt yuv420p -crf 23 -preset veryfast -movflags +faststart "${mp4Out}"`;
      res = await run(tryB);
      if (res.ok && fs.existsSync(mp4Out)) {
        const vid = fs.readFileSync(mp4Out);
        await sock.sendMessage(from, { video: vid, caption: "" }, { quoted: msg });
        return;
      } else {
        console.log("Anim attempt B failed:", res.stderr || res.error);
      }

      // try writing as .webm and converting (algumas cargas são webm)
      try {
        fs.writeFileSync(webmTry, buffer);
        const tryC = `${FFMPEG_BIN} -y -analyzeduration 200M -probesize 200M -i "${webmTry}" -filter:v fps=${OUT_FPS} -vcodec libx264 -pix_fmt yuv420p -crf 23 -preset veryfast -movflags +faststart "${mp4Out}"`;
        res = await run(tryC);
        if (res.ok && fs.existsSync(mp4Out)) {
          const vid = fs.readFileSync(mp4Out);
          await sock.sendMessage(from, { video: vid, caption: "" }, { quoted: msg });
          return;
        } else {
          console.log("Anim attempt C (as webm) failed:", res.stderr || res.error);
        }
      } catch (e) {
        console.log("failed to write webmTry:", e);
      }

      // If ffmpeg direct failed, try webpmux extraction (if available)
      let webpmuxPath = null;
      const candidate = path.join(FFMPEG_DIR, process.platform === "win32" ? "webpmux.exe" : "webpmux");
      if (fs.existsSync(candidate)) webpmuxPath = candidate;
      if (!webpmuxPath) webpmuxPath = await which("webpmux");

      if (webpmuxPath) {
        console.log("webpmux found at", webpmuxPath, "— extracting frames...");
        const frames = [];
        for (let i = 1; i <= 300; i++) { // limit to 300 frames
          const outFrame = `${framePrefix}${String(i).padStart(3, "0")}.webp`;
          const cmd = `"${webpmuxPath}" -get frame ${i} "${inputWebp}" -o "${outFrame}"`;
          const r = await run(cmd);
          if (r.ok && fs.existsSync(outFrame) && fs.statSync(outFrame).size > 0) {
            frames.push(outFrame);
            continue;
          } else {
            safeUnlink(outFrame);
            break;
          }
        }

        if (frames.length === 0) {
          console.log("webpmux não extraiu frames (0).");
        } else {
          // rename to pattern frame_%03d.webp
          const patternDir = path.dirname(frames[0]);
          const patternBase = path.join(patternDir, `frame_${ts}_%03d.webp`);
          for (let i = 0; i < frames.length; i++) {
            const newName = patternBase.replace("%03d", String(i + 1).padStart(3, "0"));
            fs.renameSync(frames[i], newName);
          }
          const patternName = patternBase; // contains %03d
          // aqui usamos framerate de entrada alto e forçamos filtro de saída OUT_FPS
          const ffCmd = `${FFMPEG_BIN} -y -framerate 25 -i "${patternName}" -filter:v fps=${OUT_FPS} -vcodec libx264 -pix_fmt yuv420p -crf 23 -preset veryfast -movflags +faststart "${mp4Out}"`;
          const r2 = await run(ffCmd);

          // cleanup frames list
          let created = [];
          for (let i = 1; i <= frames.length; i++) {
            const f = patternBase.replace("%03d", String(i).padStart(3, "0"));
            if (fs.existsSync(f)) created.push(f);
          }
          if (r2.ok && fs.existsSync(mp4Out)) {
            const vid = fs.readFileSync(mp4Out);
            await sock.sendMessage(from, { video: vid, caption: "" }, { quoted: msg });
            // cleanup
            safeUnlink(inputWebp);
            safeUnlink(webmTry);
            safeUnlink(mp4Out);
            for (const f of created) safeUnlink(f);
            return;
          } else {
            console.log("ffmpeg after webpmux frames failed:", r2.stderr || r2.error);
            for (const f of created) safeUnlink(f);
          }
        }
      } else {
        console.log("webpmux não encontrado.");
      }

      // LAST FALLBACK: extract single frame PNG (force one frame)
      console.log("Tentando fallback: extrair 1 frame (png)");
      const tryPng = `${FFMPEG_BIN} -y -analyzeduration 200M -probesize 200M -i "${inputWebp}" -frames:v 1 -update 1 "${pngOut}"`;
      res = await run(tryPng);
      if (res.ok && fs.existsSync(pngOut)) {
        const img = fs.readFileSync(pngOut);
        await sock.sendMessage(from, { image: img, caption: "(fallback) extraí 1 frame da figurinha" }, { quoted: msg });
        return;
      }

      // if we got here: fail
      console.error("Todas as tentativas falharam. Veja logs acima.");
      const installHint = [
        "Não consegui converter a figurinha animada automaticamente.",
        "Pra resolver 100% instale as ferramentas libwebp (webpmux/dwebp).",
        "No Windows: baixe os prebuilt binaries do libwebp e coloque webpmux.exe em C:/ffmpeg/bin ou em PATH.",
        "Depois reinicie o bot — ele vai detectar automaticamente."
      ].join("\n");
      await sock.sendMessage(from, { text: installHint }, { quoted: msg });

    } catch (err) {
      console.error("ERRO GERAL no toimg:", err);
      await sock.sendMessage(from, { text: erros_prontos }, { quoted: msg });
    } finally {
      // cleanup minimal
      safeUnlink(inputWebp);
      safeUnlink(pngOut);
      safeUnlink(mp4Out);
      safeUnlink(webmTry);
      try {
        const files = fs.readdirSync(tempDir);
        for (const f of files) {
          if (f.includes(`frames_${ts}_`) || f.includes(`frame_${ts}_`)) {
            safeUnlink(path.join(tempDir, f));
          }
        }
      } catch {}
    }
  }
};
