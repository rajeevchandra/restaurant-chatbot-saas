# 🚀 Production Deployment Guide

## Prerequisites

- Docker & Docker Compose installed
- Domain name configured (for production)
- SSL certificates (for HTTPS)
- Stripe/Square account with API keys

## Quick Start

### 1. Initial Setup

```bash
# Clone repository
git clone https://github.com/your-username/restaurant-chatbot-saas.git
cd restaurant-chatbot-saas

# Copy and configure environment
cp .env.production.example .env
nano .env  # Edit with your values

# Make deployment script executable
chmod +x deploy.sh
```

### 2. Configure Environment Variables

Edit `.env` file with your production values:

```bash
# Required: Strong passwords
POSTGRES_PASSWORD=<generate-strong-password>
JWT_SECRET=<generate-32-char-secret>
JWT_REFRESH_SECRET=<generate-32-char-secret>

# Required: Payment encryption key (64 hex chars)
PAYMENT_CONFIG_ENC_KEY=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Required: Stripe credentials
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Required: Update domains
CORS_ORIGIN=https://admin.yourdomain.com,https://widget.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
VITE_API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### 3. Deploy

```bash
# Full production deployment
./deploy.sh production
```

## Deployment Commands

```bash
# Check requirements and environment
./deploy.sh check

# Build Docker images
./deploy.sh build

# Start services
./deploy.sh start

# Stop services
./deploy.sh stop

# Restart services
./deploy.sh restart

# Run database migrations
./deploy.sh migrate

# Backup database
./deploy.sh backup

# Health check
./deploy.sh health

# View logs
./deploy.sh logs

# Service status
./deploy.sh status

# Cleanup old images
./deploy.sh cleanup
```

## Architecture

```
┌─────────────────────────────────────────┐
│          Load Balancer / CDN            │
│        (Nginx / Cloudflare)             │
└────────────┬────────────────────────────┘
             │
    ┌────────┴─────────┬─────────────────┐
    │                  │                  │
┌───▼───┐      ┌──────▼──────┐   ┌──────▼──────┐
│ Admin │      │    API      │   │   Widget    │
│ :3001 │      │   :3000     │   │   :3002     │
└───────┘      └─────┬───────┘   └─────────────┘
                     │
              ┌──────▼──────┐
              │  PostgreSQL │
              │    :5432    │
              └─────────────┘
```

## Services

| Service    | Port | URL                              |
|------------|------|----------------------------------|
| API        | 3000 | http://localhost:3000            |
| Admin      | 3001 | http://localhost:3001            |
| Widget     | 3002 | http://localhost:3002            |
| PostgreSQL | 5432 | postgresql://localhost:5432      |

## Production Checklist

### Security

- [ ] Change all default passwords
- [ ] Generate secure JWT secrets (min 32 characters)
- [ ] Generate secure encryption key (64 hex characters)
- [ ] Use production Stripe keys (not test keys)
- [ ] Configure CORS for your domains only
- [ ] Set up SSL/TLS certificates
- [ ] Enable firewall rules
- [ ] Configure rate limiting
- [ ] Set up monitoring (Sentry, DataDog, etc.)

### Database

- [ ] Set strong PostgreSQL password
- [ ] Enable automated backups
- [ ] Configure backup retention policy
- [ ] Set up database replication (for high availability)
- [ ] Monitor database performance

### Environment

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set up environment-specific configs
- [ ] Verify all required env vars are set

### Payment Integration

- [ ] Set up Stripe webhook endpoint: `https://api.yourdomain.com/api/v1/webhooks/stripe`
- [ ] Configure webhook secret in Stripe dashboard
- [ ] Test payment flow end-to-end
- [ ] Enable payment polling as fallback
- [ ] Set up payment failure notifications

### Monitoring & Logging

- [ ] Configure log aggregation
- [ ] Set up health check monitoring
- [ ] Configure uptime monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Enable performance monitoring
- [ ] Configure alerts for critical errors

### Performance

- [ ] Enable CDN for static assets
- [ ] Configure caching (Redis)
- [ ] Optimize database queries
- [ ] Set up load balancing (for scale)
- [ ] Enable Gzip compression

## Backup & Recovery

### Automated Backups

The deployment script automatically creates database backups before each deployment.

```bash
# Manual backup
./deploy.sh backup

# Backups are stored in: ./backups/db_backup_YYYYMMDD_HHMMSS.sql
```

### Restore from Backup

```bash
# Stop services
./deploy.sh stop

# Restore database
docker-compose up -d postgres
cat backups/db_backup_20260110_120000.sql | docker-compose exec -T postgres psql -U postgres restaurant_saas

# Start services
./deploy.sh start
```

## Scaling

### Horizontal Scaling

Use Docker Swarm or Kubernetes:

```bash
# Docker Swarm
docker swarm init
docker stack deploy -c docker-compose.prod.yml restaurant-saas

# Kubernetes
kubectl apply -f k8s/
```

### Vertical Scaling

Update resource limits in `docker-compose.prod.yml`:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Troubleshooting

### Services won't start

```bash
# Check logs
./deploy.sh logs

# Check service status
./deploy.sh status

# Verify environment
./deploy.sh check
```

### Database connection issues

```bash
# Check database health
docker-compose exec postgres pg_isready -U postgres

# Check connection string
grep DATABASE_URL .env

# Restart database
docker-compose restart postgres
```

### Payment webhooks not working

```bash
# Verify webhook secret
grep STRIPE_WEBHOOK_SECRET .env

# Check webhook logs
./deploy.sh logs | grep webhook

# Test webhook endpoint
curl -X POST https://api.yourdomain.com/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### High memory usage

```bash
# Check resource usage
docker stats

# Restart services
./deploy.sh restart
```

## Maintenance

### Regular Tasks

- **Daily**: Check logs for errors
- **Weekly**: Review backups
- **Monthly**: Update dependencies
- **Quarterly**: Security audit

### Updates

```bash
# Pull latest code
git pull origin main

# Backup before update
./deploy.sh backup

# Deploy updates
./deploy.sh production
```

## Monitoring Endpoints

- **API Health**: `GET /health` or `GET /api/health`
- **Database Health**: Check via health endpoint
- **Service Status**: `./deploy.sh status`

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-username/restaurant-chatbot-saas/issues
- Documentation: See IMPLEMENTATION_NOTES.md

## License

[Your License Here]
