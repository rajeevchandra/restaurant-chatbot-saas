# Restaurant SaaS Development Environment Launcher
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Starting Restaurant SaaS Dev Environment" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Start API Server (Port 3000)
Write-Host "[1/3] Starting API Server on port 3000..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\api'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2

# Start Admin Dashboard (Port 3001)
Write-Host "[2/3] Starting Admin Dashboard on port 3001..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\admin'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2

# Start Widget (Port 3004)
Write-Host "[3/3] Starting Widget on port 3004..." -ForegroundColor Yellow
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\widget'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "All services started!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "API Server:        " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "Admin Dashboard:   " -NoNewline; Write-Host "http://localhost:3001" -ForegroundColor Cyan
Write-Host "Widget:            " -NoNewline; Write-Host "http://localhost:3004" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to exit (services will keep running)..." -ForegroundColor Gray
Read-Host
