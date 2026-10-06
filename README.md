# Rental Scout

> **Tagline:** Find it. See it. Connect.

Rental Scout is Uganda's premier rental property discovery marketplace that connects tenants directly with verified landlords.

The platform eliminates the need for tenants to physically wander through neighborhoods or pay exorbitant broker commissions (often an entire month's rent). Tenants can search verified listings, view authentic interior photos and virtual video tours, see exact distances from main transport roads, and pay a nominal **UGX 5,000** unlock fee via Mobile Money to access direct telephone and WhatsApp contact with property owners.

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
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000` with the Express API and Vite React frontend mounted concurrently.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## Local test data and administration

Run `npm run seed:dev` to create development test data. The script refuses to run in production and generates one-time random passwords, printed only to the local console. No administrator account is seeded; create one interactively with `npm run admin:create`.

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

## License
Proprietary — Rental Scout Uganda. All Rights Reserved.
