@echo off
setlocal
title BudgetBite Launcher

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend\public"
set "PYTHON=%ROOT%venv\Scripts\python.exe"

if not exist "%PYTHON%" (
    echo ERROR: Python not found: %PYTHON%
    pause
    exit /b 1
)

echo Starting BudgetBite backend on http://127.0.0.1:8000 ...
powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue; if (-not $p) { Start-Process -FilePath '%PYTHON%' -ArgumentList @('-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8000') -WorkingDirectory '%BACKEND%' -WindowStyle Hidden }"

echo Starting BudgetBite app on http://localhost:5500 ...
powershell -NoProfile -Command "$p = Get-NetTCPConnection -LocalPort 5500 -State Listen -ErrorAction SilentlyContinue; if (-not $p) { Start-Process -FilePath '%PYTHON%' -ArgumentList @('-m','http.server','5500') -WorkingDirectory '%FRONTEND%' -WindowStyle Hidden }"

echo Waiting for backend...
powershell -NoProfile -Command "$ok=$false; for($i=0;$i -lt 30;$i++){try{$r=Invoke-WebRequest 'http://127.0.0.1:8000/health' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){$ok=$true;break}}catch{}; Start-Sleep 1}; if(-not $ok){exit 1}"
if errorlevel 1 (
    echo ERROR: Backend did not start. Check the backend configuration.
    pause
    exit /b 1
)

start "" "http://localhost:5500/index.html"
echo.
echo BudgetBite is running. Close this window any time; the servers keep running in the background.
pause
endlocal