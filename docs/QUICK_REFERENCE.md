# Quick Reference Guide

Essential commands and workflows for managing your Restaurant SaaS application.

## 🚀 Quick Start

### First Time Setup
```bash
# 1. Configure environment
cp .env.production.example .env
# Edit .env with your values

# 2. Verify configuration
chmod +x verify-production.sh
./verify-production.sh

# 3. Make deploy script executable
chmod +x deploy.sh

# 4. Deploy
./deploy.sh production
```

---

## 📋 Common Commands

### Deployment
```bash
# Full deployment (build + migrate + start)
./deploy.sh production

# Deploy to staging
./deploy.sh staging

# Check prerequisites and configuration
./deploy.sh check

# Build Docker images only
./deploy.sh build

# Run database migrations only
./deploy.sh migrate
```

### Service Management
```bash
# Start all services
./deploy.sh start

# Stop all services
./deploy.sh stop

# Restart all services
./deploy.sh restart

# Check service health
./deploy.sh health

# View service status
./deploy.sh status
```

### Monitoring & Logs
```bash
# View all logs
./deploy.sh logs

# View specific service logs
./deploy.sh logs api
./deploy.sh logs admin
./deploy.sh logs widget
./deploy.sh logs postgres

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f api

# View last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 api
```

### Database
```bash
# Create backup
./deploy.sh backup

# List backups
ls -lh backups/

# Restore from backup (manual)
docker exec -i restaurant-postgres psql -U postgres -d restaurant < backups/db_backup_20240101_120000.sql

# Access database shell
docker exec -it restaurant-postgres psql -U postgres -d restaurant

# Run migrations
docker exec restaurant-api pnpm --filter @restaurant-saas/api prisma migrate deploy
```

### Maintenance
```bash
# Clean up old images and backups
./deploy.sh cleanup

# Remove all containers and volumes (DESTRUCTIVE)
docker-compose -f docker-compose.prod.yml down -v

# Update images without rebuilding
docker-compose -f docker-compose.prod.yml pull

# Rebuild specific service
docker-compose -f docker-compose.prod.yml build --no-cache api
```

---

## 🔍 Health Checks

### Service Endpoints
```bash
# API health
curl http://localhost:3000/health

# API readiness (checks database)
curl http://localhost:3000/ready

# API liveness
curl http://localhost:3000/live

# Admin app
curl http://localhost:3001/

# Widget
curl http://localhost:3002/
```

### Database Connection
```bash
# Test from host
docker exec restaurant-postgres pg_isready -U postgres

# Check connections
docker exec restaurant-postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check Docker daemon
docker info

# View container status
docker-compose -f docker-compose.prod.yml ps

# View detailed logs
docker-compose -f docker-compose.prod.yml logs api

# Inspect container
docker inspect restaurant-api

# Check resource usage
docker stats
```

### Database Issues

```bash
# Check if database is accessible
docker exec restaurant-postgres pg_isready

# Check database logs
docker logs restaurant-postgres

# Check database size
docker exec restaurant-postgres psql -U postgres -c "\l+"

# Check table sizes
docker exec restaurant-postgres psql -U postgres -d restaurant -c "\dt+"
```

### Payment Webhooks Not Working

```bash
# Check webhook logs
docker logs restaurant-api | grep webhook

# Test webhook endpoint
curl -X POST http://localhost:3000/api/v1/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check Stripe webhook configuration
# Go to: https://dashboard.stripe.com/webhooks

# Verify webhook secret in .env
grep STRIPE_WEBHOOK_SECRET .env
```

### High Memory Usage

```bash
# Check memory usage per container
docker stats --no-stream

# Restart specific service
docker-compose -f docker-compose.prod.yml restart api

# Limit container memory
# Edit docker-compose.prod.yml and add:
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

### Application Errors

```bash
# View error logs
docker logs restaurant-api 2>&1 | grep -i error

# Check API health endpoint
curl http://localhost:3000/health

# View last 50 error lines
docker logs restaurant-api 2>&1 | grep -i error | tail -50

# Access container shell for debugging
docker exec -it restaurant-api sh
```

---

## 🔐 Security

### Update Secrets
```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate new encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# After updating .env, restart services
./deploy.sh restart
```

### SSL Certificate Renewal
```bash
# If using Let's Encrypt with certbot
sudo certbot renew

# Reload nginx
sudo systemctl reload nginx

# Check certificate expiry
openssl s_client -connect your-domain.com:443 -servername your-domain.com 2>/dev/null | openssl x509 -noout -dates
```

### Review Access Logs
```bash
# View nginx access logs (if using)
sudo tail -f /var/log/nginx/access.log

# Check for suspicious activity
docker logs restaurant-api | grep -E "401|403|429"

# View failed login attempts
docker logs restaurant-api | grep "authentication failed"
```

---

## 📊 Performance

### Monitor Resources
```bash
# Real-time container stats
docker stats

# Check disk usage
df -h

# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

### Database Performance
```bash
# Show slow queries (if pg_stat_statements enabled)
docker exec restaurant-postgres psql -U postgres -d restaurant -c \
  "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Analyze table
docker exec restaurant-postgres psql -U postgres -d restaurant -c "ANALYZE orders;"

# Vacuum database
docker exec restaurant-postgres psql -U postgres -d restaurant -c "VACUUM ANALYZE;"
```

### Cache Optimization (if Redis enabled)
```bash
# Check Redis connection
docker exec restaurant-redis redis-cli ping

# View Redis info
docker exec restaurant-redis redis-cli info

# Clear cache
docker exec restaurant-redis redis-cli FLUSHALL
```

---

## 🔄 Updates & Rollbacks

### Update Application Code
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
./deploy.sh build
./deploy.sh restart

# Verify deployment
./deploy.sh health
```

### Update Dependencies
```bash
# Update npm packages (run in apps/api, admin, widget)
pnpm update

# Rebuild images
./deploy.sh build

# Test in staging first!
./deploy.sh staging
```

### Rollback Deployment
```bash
# 1. Stop current services
./deploy.sh stop

# 2. Restore database backup
cat backups/db_backup_20240101_120000.sql | \
  docker exec -i restaurant-postgres psql -U postgres -d restaurant

# 3. Checkout previous code version
git checkout <previous-commit-hash>

# 4. Rebuild and restart
./deploy.sh build
./deploy.sh start

# 5. Verify
./deploy.sh health
```

---

## 📈 Monitoring Metrics

### Key Metrics to Track

**Application Health**
- API response time (target: <200ms)
- Error rate (target: <1%)
- Request rate (requests/second)
- Active connections

**Database**
- Connection pool usage
- Query execution time
- Database size growth
- Active queries

**System Resources**
- CPU usage (target: <70%)
- Memory usage (target: <80%)
- Disk usage (target: <80%)
- Network I/O

**Business Metrics**
- Orders per hour
- Payment success rate (target: >95%)
- Webhook delivery rate (target: >99%)
- Average order value
- Customer satisfaction

---

## 🔗 Useful Links

### Development
- **API Documentation**: http://localhost:3000/api-docs
- **Admin Panel**: http://localhost:3001
- **Widget Demo**: http://localhost:3002

### Production
- **API**: https://api.your-domain.com
- **Admin**: https://admin.your-domain.com
- **Widget Embed**: https://widget.your-domain.com/embed.js

### External Services
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Square Dashboard**: https://squareup.com/dashboard
- **GitHub Repo**: Your repository URL
- **Monitoring**: Your monitoring dashboard URL

---

## 📞 Emergency Procedures

### Service Down
1. Check service status: `./deploy.sh status`
2. View logs: `./deploy.sh logs`
3. Restart service: `./deploy.sh restart`
4. Check health: `./deploy.sh health`
5. If still down, check external dependencies (DB, network)

### Database Corruption
1. Stop application: `./deploy.sh stop`
2. Create emergency backup: `./deploy.sh backup`
3. Restore from last known good backup
4. Run database integrity checks
5. Restart application: `./deploy.sh start`

### Payment Processing Issues
1. Check Stripe dashboard for incidents
2. Verify webhook endpoint is accessible
3. Check STRIPE_WEBHOOK_SECRET in .env
4. Review recent payment logs
5. Enable payment polling if webhooks fail

### High Load
1. Check resource usage: `docker stats`
2. Scale horizontally if needed
3. Enable caching (Redis)
4. Optimize database queries
5. Add rate limiting

---

## 💡 Tips & Best Practices

1. **Always backup before deployment**
   ```bash
   ./deploy.sh backup
   ```

2. **Test in staging first**
   ```bash
   ./deploy.sh staging
   ```

3. **Monitor logs after deployment**
   ```bash
   ./deploy.sh logs -f
   ```

4. **Keep backups for 30 days**
   - Automated by deploy script
   - Verify backups work regularly

5. **Document all changes**
   - Update CHANGELOG.md
   - Tag releases in git

6. **Regular maintenance**
   - Weekly: Review logs and metrics
   - Monthly: Update dependencies
   - Quarterly: Security audit

7. **Zero-downtime deployments**
   - Use blue-green deployment
   - Or rolling updates with load balancer

---

**Need Help?**
- Check `DEPLOYMENT.md` for detailed guides
- Review `PRODUCTION_CHECKLIST.md` for deployment prep
- Run `./verify-production.sh` to check configuration
- Check logs: `./deploy.sh logs`
