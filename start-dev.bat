@echo off
echo ====================================
echo Starting Restaurant SaaS Development Environment
echo ====================================
echo.

REM Start API Server (Port 3000)
echo [1/3] Starting API Server on port 3000...
copy /Y .env apps\api\.env >nul
start "API_Server" cmd /k "cd apps\api && npx tsx watch src/server.ts"
timeout /t 2 /nobreak >nul

REM Start Admin Dashboard (Port 3001)
echo [2/3] Starting Admin Dashboard on port 3001...
start "Admin_Dashboard" cmd /k "cd apps\admin && npm run dev"
timeout /t 2 /nobreak >nul

REM Start Widget (Port 3002)
echo [3/3] Starting Widget on port 3002...
start "Widget" cmd /k "cd apps\widget && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ====================================
echo All services started!
echo ====================================
echo.
echo API Server:        http://localhost:3000
echo Admin Dashboard:   http://localhost:3001
echo Widget:            http://localhost:3002
echo.
echo Press any key to close all service windows...
pause >nul

REM Close all service windows by title
taskkill /FI "WINDOWTITLE eq API_Server*" /T /F
taskkill /FI "WINDOWTITLE eq Admin_Dashboard*" /T /F
taskkill /FI "WINDOWTITLE eq Widget*" /T /F
