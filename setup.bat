@echo off
REM Restaurant Chatbot SaaS - Setup Script for Windows
REM Run with: setup.bat

echo.
echo ================================
echo Restaurant Chatbot SaaS - Setup
echo ================================
echo.

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 20+ from https://nodejs.org
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% installed

REM Check npm
echo Checking npm...
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION% installed

REM Check Docker (optional)
echo Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Docker not found. Will use local setup.
    set USE_DOCKER=n
) else (
    for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VERSION=%%i
    echo [OK] Docker installed: %DOCKER_VERSION%
    set /p USE_DOCKER="Do you want to use Docker for local development? (y/n): "
)

echo.
echo Installing dependencies...
call npm install --workspaces

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)

echo [OK] Dependencies installed
echo.

REM Create .env if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env >nul
    echo [OK] .env file created
    echo [WARNING] Please edit .env and set your configuration
) else (
    echo [OK] .env file already exists
)

echo.

if /i "%USE_DOCKER%"=="y" (
    echo Starting services with Docker...
    docker-compose up -d
    
    echo.
    echo Waiting for services to be ready...
    timeout /t 10 /nobreak >nul
    
    echo.
    echo [OK] Setup complete!
    echo.
    echo Services running:
    echo   - API:            http://localhost:3000
    echo   - Admin:          http://localhost:3001
    echo   - Widget:         http://localhost:3002
    echo   - Database:       localhost:5432
    echo.
    echo Demo Credentials:
    echo   Email:    owner@demo.com
    echo   Password: password123
    echo.
    echo Useful commands:
    echo   docker-compose logs -f        # View logs
    echo   docker-compose down           # Stop services
    echo   docker-compose down -v        # Stop and remove data
) else (
    echo Setting up local database...
    echo Make sure PostgreSQL is running on localhost:5432
    echo.
    
    set /p CONTINUE_SETUP="Continue with database setup? (y/n): "
    
    if /i "%CONTINUE_SETUP%"=="y" (
        echo Generating Prisma client...
        cd apps\api
        call npm run db:generate
        
        echo Running migrations...
        call npm run db:migrate
        
        echo Seeding database...
        call npm run db:seed
        
        cd ..\..
        
        echo.
        echo [OK] Setup complete!
        echo.
        echo Start development servers:
        echo   npm run dev                      # Start all services
        echo.
        echo Or start individually:
        echo   cd apps\api ^&^& npm run dev       # API server
        echo   cd apps\admin ^&^& npm run dev     # Admin dashboard
        echo   cd apps\widget ^&^& npm run dev    # Chat widget
        echo.
        echo Once running:
        echo   - API:            http://localhost:3000
        echo   - Admin:          http://localhost:3001
        echo   - Widget:         http://localhost:3002
        echo.
        echo Demo Credentials:
        echo   Email:    owner@demo.com
        echo   Password: password123
    ) else (
        echo.
        echo [WARNING] Database setup skipped.
        echo Run these commands manually when ready:
        echo   cd apps\api
        echo   npm run db:generate
        echo   npm run db:migrate
        echo   npm run db:seed
    )
)

echo.
echo Read README.md for more information
echo.
pause
