@echo off
echo ====================================
echo Starting Restaurant SaaS Development Environment
echo ====================================
echo.

REM Start API Server (Port 3000)
echo [1/3] Starting API Server on port 3000...
start "API Server" cmd /k "cd apps\api && npm run dev"
timeout /t 2 /nobreak >nul

REM Start Admin Dashboard (Port 3001)
echo [2/3] Starting Admin Dashboard on port 3001...
start "Admin Dashboard" cmd /k "cd apps\admin && npm run dev"
timeout /t 2 /nobreak >nul

REM Start Widget (Port 3004)
echo [3/3] Starting Widget on port 3004...
start "Widget" cmd /k "cd apps\widget && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ====================================
echo All services started!
echo ====================================
echo.
echo API Server:        http://localhost:3000
echo Admin Dashboard:   http://localhost:3001
echo Widget:            http://localhost:3004
echo.
echo Press any key to close this window (services will keep running)...
pause >nul
