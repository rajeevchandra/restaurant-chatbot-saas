# Production Launch Checklist

Complete this checklist before launching your application to production.

## Pre-Deployment Checklist

### 1. Environment Configuration ✓

- [ ] Copy `.env.production.example` to `.env`
- [ ] Generate strong `JWT_SECRET` (32+ characters)
- [ ] Generate strong `JWT_REFRESH_SECRET` (32+ characters)
- [ ] Generate `PAYMENT_CONFIG_ENC_KEY` (64 hex characters)
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database URL with SSL
- [ ] Remove all `CHANGE_ME` and example values

### 2. Payment Provider Setup ✓

#### Stripe (if using)
- [ ] Create production Stripe account
- [ ] Get LIVE API keys (starts with `sk_live_`)
- [ ] Configure webhook endpoint in Stripe Dashboard
  - URL: `https://your-domain.com/api/v1/webhooks/stripe`
  - Events: `checkout.session.completed`, `payment_intent.succeeded`
- [ ] Copy webhook signing secret (`whsec_...`)
- [ ] Test webhook delivery
- [ ] Enable payment methods (cards, wallets, etc.)

#### Square (if using)
- [ ] Create production Square account
- [ ] Get production access token
- [ ] Configure webhook endpoint
- [ ] Test webhook delivery

### 3. Security Configuration ✓

- [ ] Enable HTTPS/SSL certificates
  - [ ] Obtain SSL certificate (Let's Encrypt, etc.)
  - [ ] Configure Nginx/reverse proxy for SSL
  - [ ] Force HTTPS redirect
- [ ] Set secure `CORS_ORIGIN` (no wildcards)
- [ ] Configure `COOKIE_SECRET` (32+ characters)
- [ ] Enable rate limiting
- [ ] Configure Content Security Policy
- [ ] Review and set appropriate cookie settings
- [ ] Enable CSRF protection if needed

### 4. Database Setup ✓

- [ ] Create production database instance
- [ ] Enable automated backups
- [ ] Configure connection pooling
- [ ] Set up database monitoring
- [ ] Enable SSL connections
- [ ] Run database migrations
  ```bash
  ./deploy.sh migrate
  ```
- [ ] Seed initial data if needed
- [ ] Test database connectivity
- [ ] Document database credentials securely

### 5. Domain & DNS Configuration ✓

- [ ] Register domain name
- [ ] Configure DNS records:
  - [ ] A record for main domain
  - [ ] CNAME for www subdomain
  - [ ] A records for API subdomain (api.yourdomain.com)
  - [ ] A records for admin subdomain (admin.yourdomain.com)
- [ ] Wait for DNS propagation (24-48 hours)
- [ ] Verify DNS resolution

### 6. Server/Infrastructure Setup ✓

- [ ] Provision production server(s)
  - Minimum: 2 CPU cores, 4GB RAM
  - Recommended: 4 CPU cores, 8GB RAM
- [ ] Install required software:
  - [ ] Docker (latest stable)
  - [ ] Docker Compose (v2.0+)
  - [ ] Nginx (if using as reverse proxy)
- [ ] Configure firewall rules:
  - [ ] Allow ports 80, 443 (HTTP/HTTPS)
  - [ ] Allow port 22 (SSH, restricted IPs)
  - [ ] Block direct access to 3000, 3001, 3002
- [ ] Set up SSH key authentication
- [ ] Disable root SSH login
- [ ] Configure automatic security updates

### 7. Monitoring & Logging ✓

- [ ] Set up application monitoring:
  - [ ] Sentry for error tracking
  - [ ] DataDog/New Relic for APM (optional)
- [ ] Configure log aggregation:
  - [ ] CloudWatch/ELK/Loki
- [ ] Set up uptime monitoring:
  - [ ] Pingdom/UptimeRobot
- [ ] Configure alerting:
  - [ ] Email alerts for critical errors
  - [ ] SMS for downtime
  - [ ] Slack/Discord webhooks
- [ ] Enable Docker container logging
- [ ] Set log retention policies

### 8. Email Configuration (Optional) ✓

- [ ] Choose email provider (AWS SES, SendGrid, Mailgun)
- [ ] Configure SMTP settings
- [ ] Verify domain for email sending
- [ ] Set up email templates
- [ ] Test email delivery
- [ ] Configure SPF, DKIM, DMARC records

### 9. SMS Configuration (Optional) ✓

- [ ] Create Twilio account
- [ ] Get phone number
- [ ] Configure Twilio credentials
- [ ] Test SMS delivery
- [ ] Set up SMS templates

### 10. CDN & Storage (Optional) ✓

- [ ] Set up CDN (CloudFront, Cloudflare)
- [ ] Configure S3 bucket for images/uploads
- [ ] Set up bucket policies and CORS
- [ ] Configure image optimization
- [ ] Test file uploads

### 11. Testing & Validation ✓

- [ ] Run production readiness script:
  ```bash
  chmod +x verify-production.sh
  ./verify-production.sh
  ```
- [ ] Test all critical user flows:
  - [ ] User registration/login
  - [ ] Menu browsing
  - [ ] Order placement
  - [ ] Payment processing (test mode first!)
  - [ ] Order status updates
  - [ ] Admin panel access
  - [ ] Webhook delivery
- [ ] Load testing (optional):
  - [ ] Use k6, Artillery, or Apache Bench
  - [ ] Test peak load scenarios
- [ ] Security scanning:
  - [ ] Run OWASP ZAP scan
  - [ ] Check for exposed secrets
  - [ ] Verify HTTPS configuration

### 12. Deployment Preparation ✓

- [ ] Make deploy script executable:
  ```bash
  chmod +x deploy.sh
  ```
- [ ] Review `docker-compose.prod.yml`
- [ ] Test deployment in staging environment first
- [ ] Create rollback plan
- [ ] Document deployment steps
- [ ] Schedule deployment window
- [ ] Notify team of deployment

### 13. Legal & Compliance ✓

- [ ] Add Terms of Service
- [ ] Add Privacy Policy
- [ ] Add Cookie Policy
- [ ] GDPR compliance (if applicable):
  - [ ] Data export functionality
  - [ ] Data deletion functionality
  - [ ] Cookie consent banner
- [ ] PCI DSS compliance for payments:
  - [ ] Use tokenized payments (Stripe/Square)
  - [ ] Never store card details
  - [ ] Use HTTPS everywhere
- [ ] Add required disclaimers

---

## Deployment Steps

Once all checklist items are complete:

### 1. Pre-Deployment
```bash
# Verify everything is ready
./verify-production.sh

# Run deployment checks
./deploy.sh check
```

### 2. Initial Deployment
```bash
# Full production deployment
./deploy.sh production
```

### 3. Post-Deployment Verification
```bash
# Check service health
./deploy.sh health

# View logs
./deploy.sh logs api
./deploy.sh logs admin
./deploy.sh logs widget

# Check status
./deploy.sh status
```

### 4. Test Production
- [ ] Visit your domain
- [ ] Test widget integration
- [ ] Place test order with real payment (refund afterwards)
- [ ] Verify webhooks are working
- [ ] Check admin panel
- [ ] Verify email notifications (if enabled)
- [ ] Test on mobile devices

---

## Post-Launch Checklist

### Week 1
- [ ] Monitor error rates daily
- [ ] Check webhook delivery success rate
- [ ] Review payment processing metrics
- [ ] Monitor server resources (CPU, memory, disk)
- [ ] Check database performance
- [ ] Review logs for issues
- [ ] Gather user feedback

### Week 2-4
- [ ] Set up automated backups schedule
- [ ] Review and optimize database queries
- [ ] Implement caching if needed
- [ ] Set up regular security scans
- [ ] Create incident response plan
- [ ] Document lessons learned

### Ongoing Maintenance
- [ ] Daily: Check error logs and alerts
- [ ] Weekly: Review performance metrics
- [ ] Weekly: Database backup verification
- [ ] Monthly: Security updates
- [ ] Monthly: Dependency updates
- [ ] Quarterly: Disaster recovery drill
- [ ] Quarterly: Security audit

---

## Emergency Contacts

Document these before launch:

- **Hosting Provider Support**: _______________________
- **DNS Provider Support**: _______________________
- **Database Provider Support**: _______________________
- **Payment Provider Support**: _______________________
- **SSL Certificate Provider**: _______________________
- **On-Call Engineer**: _______________________
- **Backup Engineer**: _______________________

---

## Rollback Plan

If deployment fails:

```bash
# Stop all services
./deploy.sh stop

# Restore from backup
./deploy.sh restore backups/db_backup_YYYYMMDD_HHMMSS.sql

# Revert to previous Docker images
docker-compose -f docker-compose.prod.yml up -d --no-deps api admin widget

# Check logs
./deploy.sh logs
```

---

## Success Criteria

Your deployment is successful when:

- ✅ All services are running and healthy
- ✅ Health checks return 200 OK
- ✅ Users can access the application
- ✅ Orders are being processed
- ✅ Payments are working correctly
- ✅ Webhooks are being received
- ✅ Admin panel is accessible
- ✅ No critical errors in logs
- ✅ Database connections are stable
- ✅ SSL certificates are valid
- ✅ Monitoring is receiving data

---

## Resources

- **Deployment Guide**: See `DEPLOYMENT.md`
- **API Documentation**: https://your-domain.com/api-docs
- **Admin Panel**: https://admin.your-domain.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Server Monitoring**: Your monitoring dashboard URL
- **Status Page**: Consider adding one (e.g., status.your-domain.com)

---

**Last Updated**: [Date]  
**Reviewed By**: [Name]  
**Deployment Date**: [Date]  
**Version**: 1.0.0
