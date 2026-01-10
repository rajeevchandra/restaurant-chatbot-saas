# GitHub Actions Setup Guide

This repository includes automated CI/CD workflows using GitHub Actions.

## 🔄 Workflows

### 1. CI - Test & Build (`.github/workflows/ci.yml`)
**Triggers:** Pull requests and pushes to `develop` branch

**What it does:**
- ✅ Runs linting and type checking
- ✅ Runs unit tests with PostgreSQL database
- ✅ Builds all Docker images to verify no errors
- ✅ Runs security scans (Trivy)
- ✅ Comments on PR when all checks pass

**No setup required** - works automatically on pull requests!

---

### 2. Build & Push Images (`.github/workflows/build.yml`)
**Triggers:** Pushes to `main` branch or version tags

**What it does:**
- 🐳 Builds Docker images for api, admin, and widget
- 📦 Pushes images to GitHub Container Registry (ghcr.io)
- 🏷️ Tags images with version numbers and `latest`
- 🔐 Creates artifact attestations for security

**Setup Required:**
1. Enable GitHub Packages in repository settings
2. Images will be available at:
   - `ghcr.io/rajeevchandra/restaurant-chatbot-saas-api:latest`
   - `ghcr.io/rajeevchandra/restaurant-chatbot-saas-admin:latest`
   - `ghcr.io/rajeevchandra/restaurant-chatbot-saas-widget:latest`

---

### 3. Deploy to Production (`.github/workflows/deploy.yml`)
**Triggers:** Manual workflow dispatch

**What it does:**
- 🚀 Deploys to production or staging server
- 💾 Creates database backup (optional)
- 🔄 Runs database migrations
- 🏥 Runs health checks after deployment
- ↩️ Automatic rollback on failure
- 📢 Sends notifications

**Setup Required:**

#### A. Add GitHub Secrets
Go to: **Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:

```
SSH_PRIVATE_KEY
  - Your server's SSH private key
  - Generate: ssh-keygen -t ed25519 -C "github-actions"
  - Copy: cat ~/.ssh/id_ed25519

SERVER_HOST
  - Your server IP or domain
  - Example: 198.51.100.42

SERVER_USER
  - SSH username
  - Example: ubuntu

PRODUCTION_API_URL
  - Your API domain (without https://)
  - Example: api.your-domain.com

PRODUCTION_ADMIN_URL
  - Your admin domain (without https://)
  - Example: admin.your-domain.com

PRODUCTION_WIDGET_URL
  - Your widget domain (without https://)
  - Example: widget.your-domain.com
```

#### B. Setup Server
On your production server:

```bash
# Create deployment directory
mkdir -p ~/restaurant-saas
cd ~/restaurant-saas

# Add GitHub Actions SSH key to authorized_keys
echo "YOUR_GITHUB_ACTIONS_PUBLIC_KEY" >> ~/.ssh/authorized_keys

# Create .env file with production settings
nano .env
```

#### C. Setup GitHub Environments
Go to: **Settings → Environments → New environment**

Create environments:
- **production**: Add required reviewers for manual approval
- **staging**: No approval needed

---

## 🚀 How to Use

### Deploy to Production
1. Go to **Actions** tab
2. Select **Deploy to Production** workflow
3. Click **Run workflow**
4. Choose environment: `production` or `staging`
5. Optionally skip backup
6. Click **Run workflow**

### Create a Release
```bash
# Tag a release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

This will automatically:
- Build Docker images
- Tag them with v1.0.0
- Push to GitHub Container Registry

### Test Pull Request
Just create a PR - CI runs automatically!

---

## 📊 Workflow Status

Add badges to your README.md:

```markdown
![CI](https://github.com/rajeevchandra/restaurant-chatbot-saas/workflows/CI%20-%20Test%20&%20Build/badge.svg)
![Deploy](https://github.com/rajeevchandra/restaurant-chatbot-saas/workflows/Deploy%20to%20Production/badge.svg)
```

---

## 🔧 Advanced Configuration

### Add Slack Notifications
1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Add secret: `SLACK_WEBHOOK_URL`
3. Uncomment Slack notification step in `deploy.yml`

### Add Discord Notifications
```yaml
- name: Send Discord notification
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    status: ${{ job.status }}
```

### Customize Deployment
Edit `.github/workflows/deploy.yml`:
- Add pre-deployment tests
- Add smoke tests
- Add custom health checks
- Configure rollback strategy

---

## 🐛 Troubleshooting

### Workflow fails with "Permission denied"
- Check SSH key is correct
- Verify server allows SSH key authentication
- Check `SERVER_USER` has deployment permissions

### Health checks fail
- Verify URLs are correct (no https:// prefix)
- Check firewall allows connections
- Increase wait time in workflow

### Docker images not building
- Check Dockerfile syntax
- Verify all dependencies are in package.json
- Review build logs in Actions tab

### Deployment succeeds but site is down
- SSH to server and check logs: `./deploy.sh logs`
- Check health manually: `./deploy.sh health`
- Verify environment variables on server

---

## 📝 Best Practices

1. **Always use staging first**
   ```bash
   # Deploy to staging
   Actions → Deploy to Production → staging
   
   # Test staging thoroughly
   
   # Deploy to production
   Actions → Deploy to Production → production
   ```

2. **Never skip backups on production**
   - Keep "Skip database backup" unchecked

3. **Monitor deployments**
   - Watch Actions tab during deployment
   - Check health endpoints after deployment
   - Review logs for errors

4. **Use semantic versioning**
   ```bash
   git tag v1.0.0  # Major release
   git tag v1.1.0  # Minor update
   git tag v1.1.1  # Patch/bugfix
   ```

---

## 🔐 Security Notes

- SSH keys are encrypted in GitHub Secrets
- Docker images are scanned for vulnerabilities
- All communications use HTTPS
- Secrets are never logged or exposed
- Failed deployments trigger automatic rollback

---

## 📚 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker Build Action](https://github.com/docker/build-push-action)
- [SSH Action](https://github.com/webfactory/ssh-agent)
- [Deployment Guide](./DEPLOYMENT.md)

---

**Need Help?**
- Check workflow logs in Actions tab
- Review deployment logs: `./deploy.sh logs`
- Open an issue in the repository
