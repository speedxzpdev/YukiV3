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

function runPython(pythonExecutable, args, timeout, label) {
  console.log(`[tiktok-api] ${label}...`);
  const result = spawnSync(pythonExecutable, args, {
    cwd: API_DIR,
    encoding: "utf8",
    shell: false,
    timeout
  });

  if (result.stdout) {
    console.log(result.stdout.trim());
  }

  if (result.stderr) {
    console.error(result.stderr.trim());
  }

  return result;
}

function hasApiDependencies(pythonExecutable) {
  const result = runPython(
    pythonExecutable,
    ["-c", "import uvicorn, fastapi, yt_dlp, cachetools, aiohttp, aiofiles, pydantic"],
    5000,
    "checando dependencias"
  );
  return result.status === 0;
}

function installApiDependencies(pythonExecutable) {
  const install = runPython(
    pythonExecutable,
    ["-m", "pip", "install", "-r", "requirements.txt"],
    Number(process.env.TIKTOK_API_PIP_TIMEOUT || 180000),
    "instalando requirements"
  );

  if (install.status === 0) {
    return true;
  }

  const userInstall = runPython(
    pythonExecutable,
    ["-m", "pip", "install", "--user", "-r", "requirements.txt"],
    Number(process.env.TIKTOK_API_PIP_TIMEOUT || 180000),
    "instalando requirements no usuario"
  );

  if (userInstall.status === 0) {
    return true;
  }

  const breakSystemPackages = runPython(
    pythonExecutable,
    ["-m", "pip", "install", "--break-system-packages", "-r", "requirements.txt"],
    Number(process.env.TIKTOK_API_PIP_TIMEOUT || 180000),
    "instalando requirements com break-system-packages"
  );

  return breakSystemPackages.status === 0;
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
    let bootPython = fs.existsSync(venvPython) ? venvPython : pythonExecutable;

    if (!fs.existsSync(venvPython)) {
      const venvResult = runPython(
        pythonExecutable,
        ["-m", "venv", "venv"],
        30000,
        "criando venv"
      );

      if (venvResult.status === 0 && fs.existsSync(venvPython)) {
        bootPython = venvPython;
      } else {
        console.error("[tiktok-api] nao consegui criar venv, tentando usar python do sistema");
      }
    }

    if (!hasApiDependencies(bootPython)) {
      const installed = installApiDependencies(bootPython);
      if (!installed || !hasApiDependencies(bootPython)) {
        throw new Error("Dependencias da API do TikTok nao estao prontas. Veja o log [tiktok-api] acima.");
      }
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
