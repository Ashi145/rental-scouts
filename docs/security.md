# Rental Scout — Security Hardening Documentation

## 1. Authentication & Session Management
- **Token Security**: Signed cryptographic tokens with 7-day expiration.
- **HTTP-Only Cookies**: Cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` in production to mitigate XSS-based token theft.
- **Password Protection**: Passwords hashed using PBKDF2 with unique salts. No plaintext passwords stored or logged.

## 2. Authorization & RBAC
- **Server-Side Enforcement**: All protected endpoints pass through `requireAuth` and `requireRole(['LANDLORD', 'ADMIN'])`.
- **Resource Ownership**: Landlords can only edit and delete properties where `property.landlordId === req.user.id`.
- **Admin Privilege Isolation**: Ordinary users cannot access administrative moderation or payment reconciliation routes.

## 3. Contact Privacy Protection
- Public property GET requests strictly strip landlord phone numbers.
- Contact is only revealed when `ContactUnlock` record exists in the database for the authenticated tenant.
- Obfuscation or CSS-hiding is prohibited; the number is literally not sent over the wire before payment.

## 4. Rate Limiting & Brute Force Prevention
- Authentication endpoints: 60 requests per 15 minutes per IP.
- Payment initiation endpoints: 30 requests per 5 minutes per IP.
- Global security headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and HSTS in production.
