# Rental Scout — Technical Architecture

## 1. Executive Summary

Rental Scout ("Find it. See it. Connect.") is Uganda's premier rental property marketplace designed to bridge tenants directly with verified landlords. It completely circumvents exploitative street broker commissions (typically 1 month's rent) by charging a nominal **UGX 5,000** contact unlock fee via Mobile Money (MTN MoMo & Airtel Money).

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│               Frontend Presentation Layer              │
│       Vite + React 19 + TypeScript + Tailwind CSS     │
│   (Zero-Pill Metadata, Tabular Numerals, Anti-Slop)   │
└───────────────────────────┬────────────────────────────┘
                            │ Authenticated JSON REST
                            ▼
┌────────────────────────────────────────────────────────┐
│               Backend Application Layer                │
│                 Express (Node.js / TS)                 │
│                                                        │
│  ├── Security Headers (CSP, HSTS, Sniff Prevention)   │
│  ├── Rate Limiters (Auth, Payments, General API)       │
│  ├── Auth & RBAC (Tenant, Landlord, Admin)             │
│  ├── Property Moderation & Search Filters              │
│  ├── Payment Orchestrator (UGX 5,000 Backend Rule)    │
│  └── Audit Logging Engine                              │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌─────────────────────────┐   ┌───────────────────────────┐
│     Payment Layer       │   │  Relational Data Storage  │
│ ├── Sandbox Provider    │   │  SQLite (WAL, foreign keys)│
│ ├── MTN MoMo OpenAPI    │   │  Indexes & Foreign Keys   │
│ └── Airtel Money API    │   │  Audit Logs & Unlocks     │
└─────────────────────────┘   └───────────────────────────┘
```

## 3. Core Architectural Principles

1. **Backend-First Business Logic**: The frontend NEVER determines payment amounts, unlock permissions, or verification statuses. All operations are authorized server-side.
2. **Strict Landlord Phone Privacy**: Landlord telephone numbers and direct WhatsApp links are never exposed in public responses, search listings, or HTML source. The backend provides them only when an active `ContactUnlock` record exists for the authenticated user.
3. **Payment Provider Abstraction**: Switchable between MTN MoMo, Airtel Money, and local sandbox via `PAYMENT_PROVIDER` environment configuration without changing application code.
4. **Unified API for Web & Mobile**: Designed so a future Flutter or Kotlin/Swift mobile app can consume the exact same endpoints (`/api/*`).
