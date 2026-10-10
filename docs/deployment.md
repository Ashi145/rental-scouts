# Rental Scout — Production Deployment & Operations

## 1. Prerequisites
- Node.js 20+ runtime
- Persistent writable storage for the SQLite database file (daily encrypted backups recommended)
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
- [ ] HTTPS enforced via reverse proxy (Cloudflare, Nginx, or Google Cloud Run).
- [ ] `NODE_ENV=production` configured.
- [ ] `AUTH_SECRET` and `LOCATION_FUZZ_SECRET` set to unique random values of at least 32 characters.
- [ ] Payment webhook verification configured after provider integration is implemented.
- [ ] Review and verify production security headers and rate limits.
- [ ] Automated SQLite-aware backup and restore process tested.

## SQLite storage notes

The application stores relational records in `var/rentalscout.sqlite` by default (override with `DATABASE_PATH`). The directory must be writable and persist across restarts. SQLite is a good fit for local development and a single app instance; use managed PostgreSQL before running multiple application instances or a high-write production workload. Existing JSON data in `data/rentalscout_store.json` or the former JSON file `var/rentalscout.db` is imported once into an empty SQLite database; legacy data is retained or preserved as a `.legacy.json` backup.
