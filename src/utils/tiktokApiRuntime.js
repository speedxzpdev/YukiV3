const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const API_BASE_URL = process.env.TIKTOK_API_URL || "http://127.0.0.1:8000";
const API_DIR = path.join(__dirname, "..", "api", "tiktok-api");
const HEALTHCHECK_TIMEOUT = Number(process.env.TIKTOK_API_BOOT_TIMEOUT || 30000);

const healthClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 2000
});

let bootPromise = null;
let apiProcess = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isTikTokApiHealthy() {
  try {
    const response = await healthClient.get("/");
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

function candidatePythonExecutables() {
  const candidates = [];

  if (process.env.TIKTOK_PYTHON) {
    candidates.push(process.env.TIKTOK_PYTHON);
  }

  const venvPython = process.platform === "win32"
    ? path.join(API_DIR, "venv", "Scripts", "python.exe")
    : path.join(API_DIR, "venv", "bin", "python");

  candidates.push(venvPython);

  if (process.platform === "win32") {
    candidates.push("python", "python3");
  } else {
    candidates.push("python3", "python");
  }

  return [...new Set(candidates)];
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
    shell: false,
    timeout: 3000
  });
  return !result.error && result.status === 0;
}

function resolvePythonExecutable() {
  for (const candidate of candidatePythonExecutables()) {
    if (path.isAbsolute(candidate)) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      continue;
    }

    if (commandExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveVenvPython() {
  return process.platform === "win32"
    ? path.join(API_DIR, "venv", "Scripts", "python.exe")
    : path.join(API_DIR, "venv", "bin", "python");
}

async function waitForHealth(deadlineMs) {
  while (Date.now() < deadlineMs) {
    if (await isTikTokApiHealthy()) {
      return true;
    }

    await sleep(1500);
  }

  return false;
}

function spawnApiProcess(pythonExecutable) {
  const runtimeLog = path.join(API_DIR, "uvicorn.runtime.log");
  const logFd = fs.openSync(runtimeLog, "a");

  apiProcess = spawn(
    pythonExecutable,
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    {
      cwd: API_DIR,
      detached: true,
      stdio: ["ignore", logFd, logFd],
      windowsHide: true
    }
  );

  apiProcess.unref();
  fs.closeSync(logFd);
}

async function ensureTikTokApiRunning() {
  if (await isTikTokApiHealthy()) {
    return true;
  }

  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = (async () => {
    if (await isTikTokApiHealthy()) {
      return true;
    }

    const pythonExecutable = resolvePythonExecutable();
    if (!pythonExecutable) {
      throw new Error("Python nao encontrado para iniciar a API do TikTok.");
    }

    const venvPython = resolveVenvPython();
    const bootPython = fs.existsSync(venvPython) ? venvPython : pythonExecutable;

    const importCheck = spawnSync(
      bootPython,
      ["-c", "import uvicorn, fastapi, yt_dlp, cachetools, aiohttp, aiofiles, pydantic"],
      {
        cwd: API_DIR,
        stdio: "ignore",
        shell: false,
        timeout: 5000
      }
    );

    if (importCheck.status !== 0) {
      throw new Error("Dependencias da API do TikTok nao estao prontas. Rode o start.sh para preparar o ambiente.");
    }

    if (!(await isTikTokApiHealthy())) {
      spawnApiProcess(bootPython);
      const deadlineMs = Date.now() + HEALTHCHECK_TIMEOUT;
      const started = await waitForHealth(deadlineMs);

      if (!started) {
        throw new Error("A API do TikTok nao respondeu a tempo.");
      }
    }

    return true;
  })().finally(() => {
    bootPromise = null;
  });

  return bootPromise;
}

module.exports = {
  ensureTikTokApiRunning,
  isTikTokApiHealthy
};
