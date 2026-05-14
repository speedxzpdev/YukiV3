@echo off
setlocal

cd /d "%~dp0src\api\tiktok-api"

if not exist "venv\Scripts\python.exe" (
  python -m venv venv
)

venv\Scripts\python.exe -m pip install -r requirements.txt
start "yuki-tiktok-api" /B cmd /c "venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > uvicorn.log 2>&1"

cd /d "%~dp0"
node src\index.js
