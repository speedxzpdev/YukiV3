@echo off
setlocal

cd /d "%~dp0"

set YUKI_PERSONAL_MODE=true
set YUKI_PERSONAL_NUMBER=5561983056421
set NUMBER=5561983056421
set PREFIXO=/
set YUKI_AUTH_DIR=assets/auth-lenoz

echo.
echo Yuki modo pessoal do Lenoz
echo Numero: %YUKI_PERSONAL_NUMBER%
echo Auth: src\%YUKI_AUTH_DIR%
echo Passivos: desligados
echo IA: desligada por padrao, use /enableai no chat
echo.

node src\index.js

echo.
echo Yuki encerrou.
pause
