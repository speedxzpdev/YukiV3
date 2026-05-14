@echo off
setlocal

cd /d "%~dp0src\api\tiktok-api"

if exist "venv\Scripts\activate.bat" (
  call "venv\Scripts\activate.bat"
)

start "yuki-tiktok-api" /B cmd /c "python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 > uvicorn.log 2>&1"

cd /d "%~dp0"
node src\index.js
