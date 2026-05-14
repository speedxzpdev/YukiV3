#!/bin/bash

echo "Iniciando API do TikTok..."
cd src/api/tiktok-api
source venv/bin/activate 2>/dev/null || true
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > uvicorn.log 2>&1 &
API_PID=$!
cd ../../..

trap "kill $API_PID 2>/dev/null" EXIT

sleep 2

while true
do
  echo "Iniciando Yuki..."
  node src/index.js
  echo "Bot caiu. Reiniciando em 3 segundos..."
  sleep 3
done
