# Rental Scout — Production Deployment & Operations

## 1. Prerequisites
- Node.js 20+ runtime
- PostgreSQL / Cloud SQL (or file-persisted store with daily backup snapshots)
- TLS Certificate for HTTPS
- MTN MoMo & Airtel Money production API credentials

## 2. Build & Launch Steps
```bash
# Install dependencies
npm install

# Build frontend production bundle
npm run build

# Start production server
npm run start
```

## 3. Production Environment Checklist
- [x] HTTPS enforced via reverse proxy (Cloudflare, Nginx, or Google Cloud Run).
- [x] `NODE_ENV=production` configured.
- [x] `AUTH_SECRET` set to a minimum 32-character random string.
- [x] `PAYMENT_WEBHOOK_SECRET` configured for HMAC verification.
- [x] Security headers enabled: CSP, X-Content-Type-Options, HSTS.
- [x] Rate limiting active on authentication and payment endpoints.
- [x] Automated database backup snapshot cron scheduled.
