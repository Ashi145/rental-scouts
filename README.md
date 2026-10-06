# Rental Scout

> **Tagline:** Find it. See it. Connect.

Rental Scout is a Uganda-focused property marketplace that connects tenants with verified landlords and removes the need for costly middlemen and risky informal property discovery.

The app combines a React frontend with an Express API layer, secure session handling, property discovery, contact unlock payments, landlord verification, and privacy-first serialization for exact property locations.

[![CI](https://github.com/Ashi145/rental-scouts/actions/workflows/ci.yml/badge.svg)](https://github.com/Ashi145/rental-scouts/actions/workflows/ci.yml)

---

## Features Overview

### 1. For Tenants
- **Search & Discovery**: Filter by district (Kira, Ntinda, Naalya, Kololo, Muyenga, Entebbe, etc.), property type, price range in UGX, bedrooms, and distance from main tarmac roads.
- **Visual Exploration**: High-resolution image galleries and virtual video tours.
- **Accessibility & "Getting There"**: Straight-line and road distance in meters from main transport arteries.
- **Contact Unlock (UGX 5,000)**: Instant unlock via MTN MoMo and Airtel Money with carrier USSD prompt simulation and instant verification.
- **Saved Favorites**: Save properties for review.
- **Tenant Dashboard**: View unlocked contacts, call/WhatsApp direct links, and payment receipts.
- **Fraud Reporting**: Submit reports on fake listings, incorrect locations, or price discrepancies.

### 2. For Landlords
- **Property Listing Wizard**: Multi-step submission (basic specs, location & road distance, amenities, photos & video).
- **Verification Portal**: Submit National ID (NIN) and ownership documentation (Land Title, Mailo agreement, LC1 letter) for the **✓ Verified Landlord** badge.
- **Listing Management**: Track view counts, contact unlock leads, mark properties as rented, edit, or archive.
- **Notification Stream**: Alerts when prospective tenants unlock contact details.

### 3. For Administrators
- **Platform Analytics**: Gross contact-unlock revenue in UGX, active listings, tenant and landlord counts, payment conversion rates.
- **Property Moderation Queue**: Review, approve, or reject listings with actionable reasons.
- **Landlord Verification Queue**: Review submitted identification and title proofs to grant or revoke verification badges.
- **Payment Reconciliation Ledger**: Comprehensive transaction tracking matching internal references against carrier transaction IDs.
- **Fraud & Scam Resolution**: Investigate tenant reports.
- **User Management**: Suspend or reactivate user accounts.
- **Security Audit Logs**: Chronological event logs for all administrative actions.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, TypeScript (`tsx server.ts`)
- **Architecture**: Modular layered architecture (Controllers, Middleware, Payment Provider Abstraction, Data Access Layer)
- **Database**: Relational schema with atomic persistence, foreign key integrity, indexes, and comprehensive Uganda seed data
- **Security**: Cryptographic password hashing, signed HTTP-only cookies, server-side RBAC, Content Security Policy, rate limiting, and masked identifiers
- **Payments**: PaymentProvider abstraction supporting MTN MoMo Open API, Airtel Money, and local sandbox simulation

---

## Quick Start & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the sample environment file and replace the placeholder secrets with real values for local work:
```bash
cp .env.example .env
```

Required secrets include:
- `AUTH_SECRET`
- `LOCATION_FUZZ_SECRET`
- `SESSION_SECRET`

The project intentionally fails closed if these are missing or still contain placeholder values.

### 3. Run the app locally
```bash
npm run dev
```
The application runs at `http://localhost:3000` with the Express API and Vite frontend together.

### 4. Production verification build
```bash
npm run build
npm run start
```

### 5. Tests and checks
```bash
npm run test -- --run
npm run lint
npm run build
```

---

## GitHub Actions and CI

This repository includes a GitHub Actions workflow at `.github/workflows/ci.yml` that automatically runs on pushes and pull requests to `main`.

The workflow does the following:
- installs dependencies with `npm ci`
- runs the Vitest suite
- runs TypeScript validation
- builds the production bundle

This ensures the app stays buildable and regression-safe in GitHub before merge.

---

## Local test data and administration

Run `npm run seed:dev` to create development test data. The script refuses to run in production and prints one-time verification credentials only to the local console.

Create an admin account for the local environment with:
```bash
npm run admin:create
```

---

## Documentation

Detailed technical documentation is available in the `/docs` directory:
- [Technical Architecture](docs/architecture.md)
- [Database Schema & Backup Strategy](docs/database.md)
- [REST API Specification](docs/api.md)
- [Payment Integration & Mobile Money](docs/payments.md)
- [Security Hardening & Privacy](docs/security.md)
- [Production Deployment Checklist](docs/deployment.md)
- [Future Mobile Application Architecture](docs/mobile-app-plan.md)

---

## Deployment Notes

This project is a Node.js + Express application and is not a static GitHub Pages site. For real hosting, deploy it to a Node-capable environment such as Render, Railway, Fly.io, or a VPS.

Recommended production setup:
1. Set `NODE_ENV=production` and provide strong secrets in the hosting environment.
2. Configure a real database path or persistence backend.
3. Disable demo or sandbox flows in production.
4. Use a real payment provider configuration only after provider verification.

---

## License
Proprietary — Rental Scout Uganda. All Rights Reserved.
