#!/bin/bash
# Restaurant Chatbot SaaS - Setup Script for Linux/macOS
# Run with: ./setup.sh

echo "🚀 Restaurant Chatbot SaaS - Setup Script"
echo "=========================================="
echo ""

# Check Node.js
echo "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js $NODE_VERSION installed"
else
    echo "❌ Node.js not found. Please install Node.js 20+ from https://nodejs.org"
    exit 1
fi

# Check pnpm
echo "Checking pnpm..."
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo "✅ pnpm $PNPM_VERSION installed"
else
    echo "📦 Installing pnpm..."
    npm install -g pnpm@8.15.0
    echo "✅ pnpm installed"
fi

# Check Docker (optional)
echo "Checking Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "✅ Docker installed: $DOCKER_VERSION"
    read -p "Do you want to use Docker for local development? (y/n): " USE_DOCKER
else
    echo "⚠️  Docker not found. Will use local setup."
    USE_DOCKER="n"
fi

echo ""
echo "📦 Installing dependencies..."
pnpm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please edit .env and set your configuration"
else
    echo "✅ .env file already exists"
fi

echo ""

if [ "$USE_DOCKER" = "y" ]; then
    echo "🐳 Starting services with Docker..."
    docker-compose up -d
    
    echo ""
    echo "Waiting for services to be ready..."
    sleep 10
    
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "📋 Services running:"
    echo "  🔹 API:            http://localhost:3000"
    echo "  🔹 Admin:          http://localhost:3001"
    echo "  🔹 Widget:         http://localhost:3002"
    echo "  🔹 Database:       localhost:5432"
    echo ""
    echo "📝 Demo Credentials:"
    echo "  Email:    owner@demo.com"
    echo "  Password: password123"
    echo ""
    echo "🛠️  Useful commands:"
    echo "  docker-compose logs -f        # View logs"
    echo "  docker-compose down           # Stop services"
    echo "  docker-compose down -v        # Stop and remove data"
else
    echo "🗄️  Setting up local database..."
    echo "Make sure PostgreSQL is running on localhost:5432"
    echo ""
    
    read -p "Continue with database setup? (y/n): " CONTINUE_SETUP
    
    if [ "$CONTINUE_SETUP" = "y" ]; then
        echo "Generating Prisma client..."
        cd apps/api
        pnpm db:generate
        
        echo "Running migrations..."
        pnpm db:migrate
        
        echo "Seeding database..."
        pnpm db:seed
        
        cd ../..
        
        echo ""
        echo "✅ Setup complete!"
        echo ""
        echo "🚀 Start development servers:"
        echo "  pnpm dev                      # Start all services"
        echo ""
        echo "Or start individually:"
        echo "  cd apps/api && pnpm dev       # API server"
        echo "  cd apps/admin && pnpm dev     # Admin dashboard"
        echo "  cd apps/widget && pnpm dev    # Chat widget"
        echo ""
        echo "📋 Once running:"
        echo "  🔹 API:            http://localhost:3000"
        echo "  🔹 Admin:          http://localhost:3001"
        echo "  🔹 Widget:         http://localhost:3002"
        echo ""
        echo "📝 Demo Credentials:"
        echo "  Email:    owner@demo.com"
        echo "  Password: password123"
    else
        echo ""
        echo "⚠️  Database setup skipped."
        echo "Run these commands manually when ready:"
        echo "  cd apps/api"
        echo "  pnpm db:generate"
        echo "  pnpm db:migrate"
        echo "  pnpm db:seed"
    fi
fi

echo ""
echo "📖 Read README.md for more information"
echo ""
