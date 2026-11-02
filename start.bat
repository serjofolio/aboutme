@echo off
cd /d %~dp0
if "%PORT%"=="" set PORT=5200
echo Starting HYF-OS on http://localhost:%PORT% ...
start "" cmd /c "timeout /t 2 >nul & start http://localhost:%PORT%/admin.html"
node server.js
pause
