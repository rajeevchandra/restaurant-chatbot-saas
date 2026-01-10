#!/bin/bash

# Production Readiness Verification Script
# Run this before deploying to production

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Status indicators
PASS="${GREEN}✓${NC}"
FAIL="${RED}✗${NC}"
WARN="${YELLOW}⚠${NC}"
INFO="${BLUE}ℹ${NC}"

ISSUES_FOUND=0
WARNINGS_FOUND=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Production Readiness Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check environment variable
check_env_var() {
  local var_name=$1
  local var_value=$2
  local is_required=$3
  local pattern=$4
  
  if [ -z "$var_value" ]; then
    if [ "$is_required" = "true" ]; then
      echo -e "${FAIL} $var_name: Not set (REQUIRED)"
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
      echo -e "${WARN} $var_name: Not set (optional)"
      WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    fi
    return 1
  fi
  
  if [ -n "$pattern" ]; then
    if [[ ! "$var_value" =~ $pattern ]]; then
      echo -e "${FAIL} $var_name: Invalid format"
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
      return 1
    fi
  fi
  
  # Check for default/example values
  if [[ "$var_value" == *"CHANGE_ME"* ]] || [[ "$var_value" == *"changeme"* ]] || \
     [[ "$var_value" == *"example"* ]] || [[ "$var_value" == *"localhost"* ]] || \
     [[ "$var_value" == "secret" ]] || [[ "$var_value" == "password" ]]; then
    echo -e "${WARN} $var_name: Using default/example value"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    return 1
  fi
  
  echo -e "${PASS} $var_name: Set"
  return 0
}

# ========================================
# 1. ENVIRONMENT FILE
# ========================================
echo -e "${BLUE}1. Checking Environment Configuration${NC}"
echo "----------------------------------------"

if [ ! -f ".env" ]; then
  echo -e "${FAIL} .env file not found"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
  exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Check critical environment variables
check_env_var "NODE_ENV" "$NODE_ENV" "true" "^(production|staging)$"
check_env_var "DATABASE_URL" "$DATABASE_URL" "true" "^postgres"
check_env_var "JWT_SECRET" "$JWT_SECRET" "true"
check_env_var "JWT_REFRESH_SECRET" "$JWT_REFRESH_SECRET" "true"
check_env_var "PAYMENT_CONFIG_ENC_KEY" "$PAYMENT_CONFIG_ENC_KEY" "true" "^[0-9a-f]{64}$"

echo ""

# ========================================
# 2. REQUIRED TOOLS
# ========================================
echo -e "${BLUE}2. Checking Required Tools${NC}"
echo "----------------------------------------"

if command_exists docker; then
  echo -e "${PASS} Docker installed: $(docker --version | cut -d ' ' -f3 | tr -d ',')"
else
  echo -e "${FAIL} Docker not installed"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    echo -e "${PASS} Docker Compose installed: $(docker compose version | cut -d ' ' -f4)"
  else
    echo -e "${PASS} Docker Compose installed: $(docker-compose --version | cut -d ' ' -f4 | tr -d ',')"
  fi
else
  echo -e "${FAIL} Docker Compose not installed"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

if command_exists node; then
  echo -e "${PASS} Node.js installed: $(node --version)"
else
  echo -e "${WARN} Node.js not installed (optional for development)"
  WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi

if command_exists pnpm; then
  echo -e "${PASS} pnpm installed: $(pnpm --version)"
else
  echo -e "${WARN} pnpm not installed (optional for development)"
  WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi

echo ""

# ========================================
# 3. PAYMENT CONFIGURATION
# ========================================
echo -e "${BLUE}3. Checking Payment Configuration${NC}"
echo "----------------------------------------"

# Check Stripe
if [ -n "$STRIPE_SECRET_KEY" ]; then
  if [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
    echo -e "${WARN} Stripe: Using TEST keys in production"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
  elif [[ "$STRIPE_SECRET_KEY" == sk_live_* ]]; then
    echo -e "${PASS} Stripe: Using LIVE keys"
  else
    echo -e "${FAIL} Stripe: Invalid key format"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  fi
else
  echo -e "${INFO} Stripe: Not configured"
fi

# Check Square
if [ -n "$SQUARE_ACCESS_TOKEN" ]; then
  if [[ "$SQUARE_ACCESS_TOKEN" == EAAA* ]]; then
    echo -e "${WARN} Square: Using SANDBOX keys"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
  else
    echo -e "${PASS} Square: Keys configured"
  fi
else
  echo -e "${INFO} Square: Not configured"
fi

# Check webhook secret
check_env_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET" "false" "^whsec_"

echo ""

# ========================================
# 4. SECURITY CHECKS
# ========================================
echo -e "${BLUE}4. Security Checks${NC}"
echo "----------------------------------------"

# Check JWT secrets strength
if [ -n "$JWT_SECRET" ] && [ ${#JWT_SECRET} -lt 32 ]; then
  echo -e "${WARN} JWT_SECRET is less than 32 characters"
  WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
else
  echo -e "${PASS} JWT_SECRET length sufficient"
fi

if [ -n "$JWT_REFRESH_SECRET" ] && [ ${#JWT_REFRESH_SECRET} -lt 32 ]; then
  echo -e "${WARN} JWT_REFRESH_SECRET is less than 32 characters"
  WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
else
  echo -e "${PASS} JWT_REFRESH_SECRET length sufficient"
fi

# Check encryption key format
if [ -n "$PAYMENT_CONFIG_ENC_KEY" ] && [ ${#PAYMENT_CONFIG_ENC_KEY} -eq 64 ]; then
  echo -e "${PASS} PAYMENT_CONFIG_ENC_KEY format correct (64 hex chars)"
else
  echo -e "${FAIL} PAYMENT_CONFIG_ENC_KEY must be 64 hex characters"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check CORS configuration
if [ -n "$CORS_ORIGIN" ]; then
  if [[ "$CORS_ORIGIN" == "*" ]]; then
    echo -e "${WARN} CORS_ORIGIN set to wildcard (*) - security risk"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
  else
    echo -e "${PASS} CORS_ORIGIN configured"
  fi
else
  echo -e "${WARN} CORS_ORIGIN not set"
  WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi

echo ""

# ========================================
# 5. DATABASE CHECKS
# ========================================
echo -e "${BLUE}5. Database Configuration${NC}"
echo "----------------------------------------"

if [ -n "$DATABASE_URL" ]; then
  # Check if using localhost
  if [[ "$DATABASE_URL" == *"localhost"* ]] || [[ "$DATABASE_URL" == *"127.0.0.1"* ]]; then
    echo -e "${WARN} DATABASE_URL points to localhost - may not work in containers"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
  else
    echo -e "${PASS} DATABASE_URL configured for remote host"
  fi
  
  # Check SSL mode
  if [[ "$DATABASE_URL" != *"sslmode"* ]]; then
    echo -e "${WARN} DATABASE_URL missing sslmode parameter"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
  else
    echo -e "${PASS} DATABASE_URL includes SSL configuration"
  fi
fi

# Check backup directory
if [ -d "./backups" ]; then
  echo -e "${PASS} Backup directory exists"
else
  echo -e "${WARN} Backup directory not found (will be created)"
  WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi

echo ""

# ========================================
# 6. FILE CHECKS
# ========================================
echo -e "${BLUE}6. Required Files${NC}"
echo "----------------------------------------"

required_files=(
  "docker-compose.prod.yml"
  "deploy.sh"
  "apps/api/Dockerfile"
  "apps/admin/Dockerfile"
  "apps/widget/Dockerfile"
  "apps/api/prisma/schema.prisma"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${PASS} $file"
  else
    echo -e "${FAIL} $file not found"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  fi
done

# Check deploy script permissions
if [ -x "deploy.sh" ]; then
  echo -e "${PASS} deploy.sh is executable"
else
  echo -e "${WARN} deploy.sh is not executable (run: chmod +x deploy.sh)"
  WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
fi

echo ""

# ========================================
# 7. OPTIONAL SERVICES
# ========================================
echo -e "${BLUE}7. Optional Services${NC}"
echo "----------------------------------------"

# Email configuration
if [ -n "$SMTP_HOST" ]; then
  echo -e "${PASS} Email (SMTP) configured"
else
  echo -e "${INFO} Email not configured"
fi

# SMS configuration
if [ -n "$TWILIO_ACCOUNT_SID" ]; then
  echo -e "${PASS} SMS (Twilio) configured"
else
  echo -e "${INFO} SMS not configured"
fi

# Redis
if [ -n "$REDIS_URL" ]; then
  echo -e "${PASS} Redis configured"
else
  echo -e "${INFO} Redis not configured"
fi

# S3 Storage
if [ -n "$AWS_S3_BUCKET" ]; then
  echo -e "${PASS} S3 Storage configured"
else
  echo -e "${INFO} S3 Storage not configured"
fi

# Monitoring
if [ -n "$SENTRY_DSN" ]; then
  echo -e "${PASS} Sentry monitoring configured"
else
  echo -e "${INFO} Sentry monitoring not configured"
fi

echo ""

# ========================================
# 8. DOCKER CHECKS
# ========================================
echo -e "${BLUE}8. Docker Environment${NC}"
echo "----------------------------------------"

if command_exists docker; then
  # Check if Docker daemon is running
  if docker info >/dev/null 2>&1; then
    echo -e "${PASS} Docker daemon is running"
    
    # Check for running containers
    running_containers=$(docker ps -q | wc -l)
    if [ "$running_containers" -gt 0 ]; then
      echo -e "${INFO} Found $running_containers running container(s)"
    fi
    
    # Check disk space
    docker_root=$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo "/var/lib/docker")
    available_space=$(df -BG "$docker_root" | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$available_space" -lt 10 ]; then
      echo -e "${WARN} Low disk space: ${available_space}GB available (recommend 10GB+)"
      WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    else
      echo -e "${PASS} Sufficient disk space: ${available_space}GB available"
    fi
  else
    echo -e "${FAIL} Docker daemon is not running"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  fi
fi

echo ""

# ========================================
# SUMMARY
# ========================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
  echo -e "${GREEN}✓ All checks passed!${NC}"
  echo -e "${GREEN}Your application is ready for production deployment.${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "  1. Review all environment variables in .env"
  echo "  2. Run: ./deploy.sh check"
  echo "  3. Run: ./deploy.sh production"
  exit 0
elif [ $ISSUES_FOUND -eq 0 ]; then
  echo -e "${YELLOW}⚠ Verification completed with ${WARNINGS_FOUND} warning(s)${NC}"
  echo -e "${YELLOW}Please review warnings above before deploying.${NC}"
  echo ""
  echo -e "${BLUE}You can proceed with:${NC}"
  echo "  ./deploy.sh production"
  exit 0
else
  echo -e "${RED}✗ Verification failed with ${ISSUES_FOUND} issue(s) and ${WARNINGS_FOUND} warning(s)${NC}"
  echo -e "${RED}Please fix the issues above before deploying.${NC}"
  exit 1
fi
