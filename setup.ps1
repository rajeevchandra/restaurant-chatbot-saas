# Restaurant Chatbot SaaS - Setup Script for Windows
# Run with: .\setup.ps1

Write-Host "🚀 Restaurant Chatbot SaaS - Setup Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 20+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check pnpm
Write-Host "Checking pnpm..." -ForegroundColor Yellow
try {
    $pnpmVersion = pnpm --version
    Write-Host "✅ pnpm $pnpmVersion installed" -ForegroundColor Green
} catch {
    Write-Host "📦 Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm@8.15.0
    Write-Host "✅ pnpm installed" -ForegroundColor Green
}

# Check Docker (optional)
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker installed: $dockerVersion" -ForegroundColor Green
    $useDocker = Read-Host "Do you want to use Docker for local development? (y/n)"
} catch {
    Write-Host "⚠️  Docker not found. Will use local setup." -ForegroundColor Yellow
    $useDocker = "n"
}

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pnpm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Create .env if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env file created" -ForegroundColor Green
    Write-Host "⚠️  Please edit .env and set your configuration" -ForegroundColor Yellow
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

Write-Host ""

if ($useDocker -eq "y") {
    Write-Host "🐳 Starting services with Docker..." -ForegroundColor Yellow
    docker-compose up -d
    
    Write-Host ""
    Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    Write-Host ""
    Write-Host "✅ Setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Services running:" -ForegroundColor Cyan
    Write-Host "  🔹 API:            http://localhost:3000" -ForegroundColor White
    Write-Host "  🔹 Admin:          http://localhost:3001" -ForegroundColor White
    Write-Host "  🔹 Widget:         http://localhost:3002" -ForegroundColor White
    Write-Host "  🔹 Database:       localhost:5432" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Demo Credentials:" -ForegroundColor Cyan
    Write-Host "  Email:    owner@demo.com" -ForegroundColor White
    Write-Host "  Password: password123" -ForegroundColor White
    Write-Host ""
    Write-Host "🛠️  Useful commands:" -ForegroundColor Cyan
    Write-Host "  docker-compose logs -f        # View logs" -ForegroundColor White
    Write-Host "  docker-compose down           # Stop services" -ForegroundColor White
    Write-Host "  docker-compose down -v        # Stop and remove data" -ForegroundColor White
} else {
    Write-Host "🗄️  Setting up local database..." -ForegroundColor Yellow
    Write-Host "Make sure PostgreSQL is running on localhost:5432" -ForegroundColor Yellow
    Write-Host ""
    
    $continueSetup = Read-Host "Continue with database setup? (y/n)"
    
    if ($continueSetup -eq "y") {
        Write-Host "Generating Prisma client..." -ForegroundColor Yellow
        Set-Location apps\api
        pnpm db:generate
        
        Write-Host "Running migrations..." -ForegroundColor Yellow
        pnpm db:migrate
        
        Write-Host "Seeding database..." -ForegroundColor Yellow
        pnpm db:seed
        
        Set-Location ..\..
        
        Write-Host ""
        Write-Host "✅ Setup complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 Start development servers:" -ForegroundColor Cyan
        Write-Host "  pnpm dev                      # Start all services" -ForegroundColor White
        Write-Host ""
        Write-Host "Or start individually:" -ForegroundColor Cyan
        Write-Host "  cd apps\api && pnpm dev       # API server" -ForegroundColor White
        Write-Host "  cd apps\admin && pnpm dev     # Admin dashboard" -ForegroundColor White
        Write-Host "  cd apps\widget && pnpm dev    # Chat widget" -ForegroundColor White
        Write-Host ""
        Write-Host "📋 Once running:" -ForegroundColor Cyan
        Write-Host "  🔹 API:            http://localhost:3000" -ForegroundColor White
        Write-Host "  🔹 Admin:          http://localhost:3001" -ForegroundColor White
        Write-Host "  🔹 Widget:         http://localhost:3002" -ForegroundColor White
        Write-Host ""
        Write-Host "📝 Demo Credentials:" -ForegroundColor Cyan
        Write-Host "  Email:    owner@demo.com" -ForegroundColor White
        Write-Host "  Password: password123" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "⚠️  Database setup skipped." -ForegroundColor Yellow
        Write-Host "Run these commands manually when ready:" -ForegroundColor Yellow
        Write-Host "  cd apps\api" -ForegroundColor White
        Write-Host "  pnpm db:generate" -ForegroundColor White
        Write-Host "  pnpm db:migrate" -ForegroundColor White
        Write-Host "  pnpm db:seed" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "📖 Read README.md for more information" -ForegroundColor Cyan
Write-Host ""
