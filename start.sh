#!/usr/bin/env sh

API_PID=""

echo "Iniciando API do TikTok..."
(
  cd src/api/tiktok-api || exit 0

  PYTHON_BIN="${PYTHON_BIN:-}"
  if [ -z "$PYTHON_BIN" ]; then
    if command -v python3 >/dev/null 2>&1; then
      PYTHON_BIN="$(command -v python3)"
    elif command -v python >/dev/null 2>&1; then
      PYTHON_BIN="$(command -v python)"
    fi
  fi

  if [ -z "$PYTHON_BIN" ]; then
    echo "Python nao encontrado. A Yuki vai iniciar sem a API do TikTok."
    exit 0
  fi

  VENV_PY="venv/bin/python"
  if [ ! -x "$VENV_PY" ]; then
    "$PYTHON_BIN" -m venv venv >/dev/null 2>&1 || {
      echo "Nao consegui criar o venv da API. A Yuki vai iniciar sem ela."
      exit 0
    }
  fi

  if [ ! -x "$VENV_PY" ]; then
    echo "Nao consegui preparar o venv da API. A Yuki vai iniciar sem ela."
    exit 0
  fi

  if ! "$VENV_PY" -c "import uvicorn, fastapi, yt_dlp, cachetools, aiohttp, aiofiles, pydantic" >/dev/null 2>&1; then
    "$VENV_PY" -m pip install -r requirements.txt >/dev/null 2>&1 || {
      echo "Nao consegui instalar as dependencias da API. A Yuki vai iniciar sem ela."
      exit 0
    }
  fi

  exec "$VENV_PY" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
) > uvicorn.log 2>&1 &
API_PID=$!

trap 'if [ -n "$API_PID" ]; then kill "$API_PID" 2>/dev/null; fi' EXIT INT TERM

sleep 2

while true
do
  echo "Iniciando Yuki..."
  node src/index.js
  echo "Bot caiu. Reiniciando em 3 segundos..."
  sleep 3
done
