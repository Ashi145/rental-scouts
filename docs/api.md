# Rental Scout — REST API Specification

All endpoints are served under `/api`.

## 1. Authentication
- `POST /api/auth/register`: Register new user (`TENANT` or `LANDLORD`).
- `POST /api/auth/login`: Authenticate with email and password.
- `POST /api/auth/logout`: Invalidate session cookie.
- `GET /api/auth/me`: Retrieve current session user & landlord profile.

## 2. Properties
- `GET /api/properties`: Public search with query parameters (`q`, `district`, `propertyType`, `minRent`, `maxRent`, `bedrooms`, `sort`). Contact information omitted.
- `GET /api/properties/:id`: Single property details. If user unlocked contact, returns revealed telephone and WhatsApp status; otherwise returns `contactUnlocked: false`.
- `POST /api/properties`: Landlords create rental listing.
- `PATCH /api/properties/:id`: Landlords edit property details.
- `DELETE /api/properties/:id`: Delete or archive listing.
- `POST /api/properties/:id/favorite`: Save to favorites.
- `DELETE /api/properties/:id/favorite`: Remove from favorites.

## 3. Payments & Unlocks
- `POST /api/payments/initiate`: Initiate UGX 5,000 unlock transaction via Mobile Money.
- `GET /api/payments/:id/status`: Read the status of the current tenant's payment.
- `POST /api/payments/webhook/:provider`: Provider callback endpoint; callback data is not payment confirmation by itself.
- `GET /api/payments/history`: Tenant transaction history.
- `GET /api/payments/unlocks`: Tenant unlocked properties.

## 4. Landlord Portal
- `GET /api/landlord/properties`: Landlord's listings.
- `GET /api/landlord/stats`: Real-time views, unlocks, and listings count.
- `POST /api/landlord/verification`: Submit National ID and ownership proof.

## 5. Admin Console
- `GET /api/admin/analytics`: Gross revenue in UGX, user stats, conversion rates.
- `GET /api/admin/properties`: Full properties moderation queue.
- `PATCH /api/admin/properties/:id/status`: Approve / Reject listing.
- `GET /api/admin/landlords`: Landlords verification queue.
- `PATCH /api/admin/landlords/:id/verification`: Verify or reject landlord.
- `GET /api/admin/transactions`: Payment reconciliation ledger.
- `GET /api/admin/reports`: Fraud and scam reports.
- `PATCH /api/admin/reports/:id`: Update report status.
- `GET /api/admin/users`: Accounts management.
- `PATCH /api/admin/users/:id/status`: Suspend or reactivate user.
- `GET /api/admin/audit-logs`: Chronological security audit logs.
