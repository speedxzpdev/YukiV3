// commands/toimg.js
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { exec } = require("child_process");
const util = require("util");
const execP = util.promisify(exec);
const fs = require("fs");
const path = require("path");

const OUT_FPS = 10;
const MIN_MP4_BYTES = 2000; // tamanho mínimo razoável para considerar mp4 válido

function safeUnlink(p) {
  try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
}

async function run(cmd, opts = {}) {
  try {
    const { stdout, stderr } = await execP(cmd, { maxBuffer: 1024 * 1024 * 64, ...opts });
    return { ok: true, stdout: stdout?.toString() || "", stderr: stderr?.toString() || "" };
  } catch (e) {
    return { ok: false, stdout: e.stdout?.toString() || "", stderr: e.stderr?.toString() || (e.message || ""), error: e };
  }
}

// Ajustado para Termux
async function which(bin) {
  try {
    if (process.platform === "win32") {
      const { stdout } = await execP(`where ${bin}`);
      return stdout.split(/\r?\n/)[0].trim();
    } else {
      const { stdout } = await execP(`which ${bin}`).catch(() => ({ stdout: "" }));
      if (stdout && stdout.trim()) return stdout.trim();
      // fallback Termux
      const termuxPath = `/data/data/com.termux/files/usr/bin/${bin}`;
      if (fs.existsSync(termuxPath)) return termuxPath;
      return null;
    }
  } catch {
    return null;
  }
}

module.exports = {
  name: "toimg",
  async execute(sock, msg, from, args, erros_prontos = "Erro interno", espera_pronta = "Processando...") {
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const sticker = quotedMsg?.stickerMessage;

    if (!sticker) {
      await sock.sendMessage(from, { text: "Responde um sticker (estático ou animado)." }, { quoted: msg });
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
    const webmTry = `${base}.webm`;
    const framePatternBase = path.join(tempDir, `frame_${ts}_%03d.webp`);
    const frameGlobPrefix = path.join(tempDir, `frame_${ts}_`);

    // tenta encontrar ffmpeg e webpmux no sistema
    const ffmpegPathFound = (await which("ffmpeg")) || "/data/data/com.termux/files/usr/bin/ffmpeg";
    const webpmuxPathFound = (await which("webpmux")) || null;

    if (!ffmpegPathFound) {
      await sock.sendMessage(from, { text: "FFmpeg não encontrado. Instale ou adicione ao PATH." }, { quoted: msg });
      return;
    }
    const FFMPEG_BIN = ffmpegPathFound;
    const WEBPMUX_BIN = webpmuxPathFound;

    try {
      const buffer = await downloadMediaMessage({ message: quotedMsg }, "buffer", {}, { reuploadRequest: sock.updateMediaMessage });
      fs.writeFileSync(inputWebp, buffer);

      // detecta animado por tags ANIM / ANMF (método simples e eficaz)
      const isAnimated = Buffer.isBuffer(buffer) && (buffer.includes(Buffer.from("ANMF")) || buffer.includes(Buffer.from("ANIM")));

      // Se não for animado: extrai 1 frame PNG e manda
      if (!isAnimated) {
        const cmdStill = `${FFMPEG_BIN} -y -i "${inputWebp}" -frames:v 1 "${pngOut}"`;
        const r = await run(cmdStill);
        if (r.ok && fs.existsSync(pngOut) && fs.statSync(pngOut).size > 500) {
          const img = fs.readFileSync(pngOut);
          await sock.sendMessage(from, { image: img, caption: "" }, { quoted: msg });
        } else {
          console.log("toimg - still conversion failed:", r.stderr || r.error);
          await sock.sendMessage(from, { text: "Falha ao converter sticker estático." }, { quoted: msg });
        }
        return;
      }

      // sticker animado: tentativas em cascata
      const tryA = `${FFMPEG_BIN} -y -analyzeduration 200M -probesize 200M -i "${inputWebp}" -filter:v fps=${OUT_FPS} -vcodec libx264 -pix_fmt yuv420p -crf 23 -preset veryfast -movflags +faststart "${mp4Out}"`;
      let res = await run(tryA);
      if (res.ok && fs.existsSync(mp4Out) && fs.statSync(mp4Out).size > MIN_MP4_BYTES) {
        const vid = fs.readFileSync(mp4Out);
        await sock.sendMessage(from, { video: vid, caption: "", gifPlayback: true}, { quoted: msg });
        return;
      }
      console.log("Anim attempt A failed:", res.stderr || res.error);

      const tryB = `${FFMPEG_BIN} -y -analyzeduration 200M -probesize 200M -f webp -i "${inputWebp}" -filter:v fps=${OUT_FPS} -vcodec libx264 -pix_fmt yuv420p -crf 23 -preset veryfast -movflags +faststart "${mp4Out}"`;
      res = await run(tryB);
      if (res.ok && fs.existsSync(mp4Out) && fs.statSync(mp4Out).size > MIN_MP4_BYTES) {
        const vid = fs.readFileSync(mp4Out);
        await sock.sendMessage(from, { video: vid, caption: "", gifPlayback: true}, { quoted: msg });
        return;
      }
      console.log("Anim attempt B failed:", res.stderr || res.error);

      try {
        fs.writeFileSync(webmTry, buffer);
        const tryC = `${FFMPEG_BIN} -y -analyzeduration 200M -probesize 200M -i "${webmTry}" -filter:v fps=${OUT_FPS} -vcodec libx264 -pix_fmt yuv420p -crf 23 -preset veryfast -movflags +faststart "${mp4Out}"`;
        res = await run(tryC);
        if (res.ok && fs.existsSync(mp4Out) && fs.statSync(mp4Out).size > MIN_MP4_BYTES) {
          const vid = fs.readFileSync(mp4Out);
          await sock.sendMessage(from, { video: vid, caption: "", gifPlayback: true}, { quoted: msg });
          return;
        }
        console.log("Anim attempt C (webm) failed:", res.stderr || res.error);
      } catch (e) {
        console.log("Anim attempt C error:", e);
      } finally {
        safeUnlink(webmTry);
      }

      if (WEBPMUX_BIN) {
        console.log("Tentando extrair frames com webpmux em:", WEBPMUX_BIN);
        const frames = [];
        for (let i = 1; i <= 500; i++) {
          const outFrame = frameGlobPrefix + String(i).padStart(3, "0") + ".webp";
          const cmd = `${WEBPMUX_BIN} -get frame ${i} "${inputWebp}" -o "${outFrame}"`;
          const rframe = await run(cmd);
          if (rframe.ok && fs.existsSync(outFrame) && fs.statSync(outFrame).size > 0) {
            frames.push(outFrame);
            continue;
          } else {
            safeUnlink(outFrame);
            break;
          }
        }

        if (frames.length > 0) {
          const ffCmd = `${FFMPEG_BIN} -y -framerate 25 -i "${framePatternBase}" -filter:v fps=${OUT_FPS} -vcodec libx264 -pix_fmt yuv420p -crf 23 -preset veryfast -movflags +faststart "${mp4Out}"`;
          const rseq = await run(ffCmd);
          for (const f of frames) safeUnlink(f);
          if (rseq.ok && fs.existsSync(mp4Out) && fs.statSync(mp4Out).size > MIN_MP4_BYTES) {
            const vid = fs.readFileSync(mp4Out);
            await sock.sendMessage(from, { video: vid, caption: "", gifPlayback: true}, { quoted: msg });
            return;
          } else {
            console.log("ffmpeg after webpmux frames failed:", rseq.stderr || rseq.error);
          }
        } else {
          console.log("webpmux não extraiu frames.");
        }
      } else {
        console.log("webpmux não encontrado; pulando etapa de extração por frames.");
      }

      // fallback: extrair 1 frame PNG
      console.log("Tentando fallback: extrair 1 frame PNG");
      const tryPng = `${FFMPEG_BIN} -y -analyzeduration 200M -probesize 200M -i "${inputWebp}" -frames:v 1 -update 1 "${pngOut}"`;
      res = await run(tryPng);
      if (res.ok && fs.existsSync(pngOut) && fs.statSync(pngOut).size > 500) {
        const img = fs.readFileSync(pngOut);
        await sock.sendMessage(from, { image: img, caption: "(fallback) extraí 1 frame da figurinha animada" }, { quoted: msg });
        return;
      }

      console.error("Todas as tentativas falharam. Veja logs acima.");
      const installHint = [
        "Não consegui converter a figurinha animada automaticamente.",
        "Confira se você tem FFmpeg instalado e atualizado e (opcional) webpmux (libwebp).",
        `FFmpeg detectado em: ${ffmpegPathFound}`,
        `webpmux detectado em: ${webpmuxPathFound || "não encontrado"}`
      ].join("\n");
      await sock.sendMessage(from, { text: installHint }, { quoted: msg });

    } catch (err) {
      console.error("ERRO GERAL no toimg:", err);
      await sock.sendMessage(from, { text: erros_prontos || "Erro ao processar." }, { quoted: msg });
    } finally {
      safeUnlink(inputWebp);
      safeUnlink(pngOut);
      safeUnlink(mp4Out);
      safeUnlink(webmTry);
      try {
        const files = fs.readdirSync(tempDir || ".");
        for (const f of files) {
          if (f.includes(`frame_${ts}_`) || f.includes(`frames_${ts}_`)) safeUnlink(path.join(tempDir, f));
        }
      } catch {}
    }
  }
};