# Deploy to cPanel (Shared Hosting with Node.js)

## Prerequisites
- cPanel hosting with **Node.js support** (most modern hosts: A2, InMotion, HostGator, SiteGround, etc.)
- Node.js 18+ available in cPanel
- SSH access (recommended) or File Manager

---

## Option 1: cPanel Node.js App Manager (Easiest)

### 1. In cPanel → **Setup Node.js App** → **Create Application**
| Setting | Value |
|---------|-------|
| Node.js Version | 20+ (or highest available) |
| Application Mode | Production |
| Application Root | `public_html` (or subfolder like `public_html/rental-scout`) |
| Application URL | `yourdomain.com` (or subdomain) |
| Application Startup File | `dist/server.js` |
| Package Manager | npm |

### 2. Environment Variables (in same interface)
Click **Add Variable** for each:
```
NODE_ENV=production
PORT=3000
DATABASE_PATH=./var/rentalscout.sqlite
AUTH_SECRET=your_32_char_secret
LOCATION_FUZZ_SECRET=your_32_char_secret
SESSION_SECRET=your_32_char_secret
PAYMENT_WEBHOOK_SECRET=your_32_char_secret
```

### 3. Deploy Files
**Via Git (recommended):**
```bash
# In cPanel Terminal or SSH
cd public_html
git clone https://github.com/Ashi145/rental-scouts.git .
npm install
npm run build
npm run seed:dev
npm run admin:create
```

**Via File Manager:**
1. Upload all files to `public_html`
2. In cPanel Terminal: `npm install && npm run build`

### 4. Restart App
In Node.js App Manager → Click **Restart** on your app

---

## Option 2: Manual SSH Deployment

```bash
# 1. SSH into server
ssh user@yourserver.com

# 2. Go to web root
cd public_html

# 3. Clone repo
git clone https://github.com/Ashi145/rental-scouts.git .

# 4. Install & build
npm install
npm run build

# 5. Set environment variables (create .env file)
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_PATH=./var/rentalscout.sqlite
AUTH_SECRET=your_generated_secret
LOCATION_FUZZ_SECRET=your_generated_secret
SESSION_SECRET=your_generated_secret
PAYMENT_WEBHOOK_SECRET=your_generated_secret
EOF

# 6. Seed database
npm run seed:dev
npm run admin:create

# 7. Start with PM2 (if available) or use cPanel's manager
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## Generate Secrets
Run locally and copy values:
```bash
node -e "console.log('AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64url'))"
node -e "console.log('LOCATION_FUZZ_SECRET=' + require('crypto').randomBytes(32).toString('base64url'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('base64url'))"
node -e "console.log('PAYMENT_WEBHOOK_SECRET=' + require('crypto').randomBytes(32).toString('base64url'))"
```

---

## Database Notes
- SQLite file: `var/rentalscout.sqlite` (created automatically)
- Ensure `var/` folder is writable: `chmod 755 var`
- For persistence, `var/` should be outside `public_html` if possible

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Application failed to start" | Check Node.js version (needs 18+), check logs in cPanel |
| "Database locked" | Ensure only one process accesses SQLite |
| "Permission denied" | `chmod 755 var && chmod 644 var/rentalscout.sqlite` |
| Port conflicts | cPanel assigns port automatically; use `process.env.PORT` |

---

## Files Added for cPanel
- `.cpanel.yml` - Deployment config
- `ecosystem.config.js` - PM2 process manager config
- Updated `package.json` with `build` script that compiles server.ts