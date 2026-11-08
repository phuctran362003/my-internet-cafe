@echo off
cd /d "%~dp0"
title Tiem Net

where node >nul 2>&1
if errorlevel 1 (
  echo Chua co Node.js. Dang mo trang cai dat.
  start "" https://nodejs.org/en/download
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:5173/ -TimeoutSec 2; if ($r.StatusCode -ge 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if not errorlevel 1 (
  start "" http://localhost:5173/
  exit /b 0
)

if not exist "node_modules\" (
  echo Lan dau chay, dang cai thu vien...
  call npm install
  if errorlevel 1 (
    echo Cai dat that bai.
    pause
    exit /b 1
  )
)

echo Dang mo game. Giu cua so nay mo. Dong cua so de tat game.
call npm run dev
if errorlevel 1 pause
