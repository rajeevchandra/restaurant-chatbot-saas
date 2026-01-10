#!/bin/bash

################################################################################
# Restaurant SaaS Deployment Script
# This script automates the deployment process for production environments
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
DOCKER_COMPOSE_FILE="docker-compose.yml"
PRODUCTION_COMPOSE_FILE="docker-compose.prod.yml"

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_requirements() {
    print_header "Checking Requirements"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker installed"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose installed"
    
    # Check Node.js (for local builds)
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed (optional for local builds)"
    else
        print_success "Node.js installed: $(node --version)"
    fi
    
    # Check .env file
    if [ ! -f .env ]; then
        print_error ".env file not found"
        print_info "Copy .env.example to .env and configure it"
        exit 1
    fi
    print_success ".env file exists"
}

validate_env() {
    print_header "Validating Environment Variables"
    
    required_vars=(
        "DATABASE_URL"
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "PAYMENT_CONFIG_ENC_KEY"
        "STRIPE_SECRET_KEY"
        "STRIPE_PUBLISHABLE_KEY"
        "STRIPE_WEBHOOK_SECRET"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env || [ -z "$(grep "^${var}=" .env | cut -d'=' -f2-)" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    print_success "All required environment variables present"
}

backup_database() {
    print_header "Creating Database Backup"
    
    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"
    
    # Extract database connection info from .env
    DB_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2-)
    
    if [ ! -z "$DB_URL" ]; then
        print_info "Creating backup: $BACKUP_FILE"
        docker-compose exec -T postgres pg_dump -U postgres restaurant_saas > "$BACKUP_FILE" 2>/dev/null || true
        
        if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
            print_success "Database backup created: $BACKUP_FILE"
        else
            print_warning "Backup skipped (database might be empty or not running)"
        fi
    else
        print_warning "DATABASE_URL not found, skipping backup"
    fi
}

build_images() {
    print_header "Building Docker Images"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        COMPOSE_FILE=$PRODUCTION_COMPOSE_FILE
    else
        COMPOSE_FILE=$DOCKER_COMPOSE_FILE
    fi
    
    print_info "Using compose file: $COMPOSE_FILE"
    docker-compose -f $COMPOSE_FILE build --no-cache
    print_success "Docker images built successfully"
}

run_migrations() {
    print_header "Running Database Migrations"
    
    docker-compose exec -T api sh -c "cd /app/apps/api && pnpm db:migrate:deploy" || {
        print_error "Migration failed"
        exit 1
    }
    
    print_success "Migrations completed"
}

start_services() {
    print_header "Starting Services"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        COMPOSE_FILE=$PRODUCTION_COMPOSE_FILE
    else
        COMPOSE_FILE=$DOCKER_COMPOSE_FILE
    fi
    
    docker-compose -f $COMPOSE_FILE up -d
    print_success "Services started"
}

stop_services() {
    print_header "Stopping Services"
    
    docker-compose down
    print_success "Services stopped"
}

health_check() {
    print_header "Performing Health Checks"
    
    print_info "Waiting for services to be ready..."
    sleep 10
    
    # Check API health
    if curl -f http://localhost:3000/health &> /dev/null || curl -f http://localhost:3000/api/health &> /dev/null; then
        print_success "API is healthy"
    else
        print_warning "API health check failed (endpoint might not exist)"
    fi
    
    # Check admin
    if curl -f http://localhost:3001 &> /dev/null; then
        print_success "Admin panel is healthy"
    else
        print_warning "Admin panel health check failed"
    fi
    
    # Check widget
    if curl -f http://localhost:3002 &> /dev/null; then
        print_success "Widget is healthy"
    else
        print_warning "Widget health check failed"
    fi
    
    # Check database
    if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
        print_success "Database is healthy"
    else
        print_error "Database health check failed"
    fi
}

show_logs() {
    print_header "Service Logs"
    docker-compose logs --tail=50
}

show_status() {
    print_header "Service Status"
    docker-compose ps
}

cleanup() {
    print_header "Cleaning Up"
    
    print_info "Removing unused Docker images..."
    docker image prune -f
    
    print_info "Removing old backups (keeping last 10)..."
    if [ -d "./backups" ]; then
        ls -t ./backups/db_backup_*.sql 2>/dev/null | tail -n +11 | xargs -r rm
    fi
    
    print_success "Cleanup completed"
}

deploy_full() {
    print_header "Full Deployment: $ENVIRONMENT"
    
    check_requirements
    validate_env
    backup_database
    build_images
    stop_services
    start_services
    sleep 15
    run_migrations
    health_check
    cleanup
    
    print_header "Deployment Complete!"
    print_info "Services are now running:"
    echo "  - API:          http://localhost:3000"
    echo "  - Admin Panel:  http://localhost:3001"
    echo "  - Widget:       http://localhost:3002"
    echo ""
    print_info "Run './deploy.sh logs' to view logs"
    print_info "Run './deploy.sh status' to check service status"
}

# Main command handler
case "${1:-deploy}" in
    deploy|production|staging)
        deploy_full
        ;;
    
    check)
        check_requirements
        validate_env
        ;;
    
    build)
        check_requirements
        build_images
        ;;
    
    start)
        start_services
        ;;
    
    stop)
        stop_services
        ;;
    
    restart)
        stop_services
        sleep 5
        start_services
        ;;
    
    migrate)
        run_migrations
        ;;
    
    backup)
        backup_database
        ;;
    
    health)
        health_check
        ;;
    
    logs)
        show_logs
        ;;
    
    status)
        show_status
        ;;
    
    cleanup)
        cleanup
        ;;
    
    help|--help|-h)
        echo "Restaurant SaaS Deployment Script"
        echo ""
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  deploy         Full deployment (default)"
        echo "  production     Deploy to production"
        echo "  staging        Deploy to staging"
        echo "  check          Check requirements and environment"
        echo "  build          Build Docker images"
        echo "  start          Start services"
        echo "  stop           Stop services"
        echo "  restart        Restart services"
        echo "  migrate        Run database migrations"
        echo "  backup         Backup database"
        echo "  health         Run health checks"
        echo "  logs           Show service logs"
        echo "  status         Show service status"
        echo "  cleanup        Clean up old images and backups"
        echo "  help           Show this help message"
        ;;
    
    *)
        print_error "Unknown command: $1"
        echo "Run './deploy.sh help' for usage information"
        exit 1
        ;;
esac
