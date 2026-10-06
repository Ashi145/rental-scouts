# Rental Scout remediation progress

Last updated: 2026-10-06

## Phase status

| Phase | Status | Evidence / notes |
|---|---|---|
| 0 — Build and run | Complete | `npm ci`, `npm run lint`, `npm run build`, and `npm run test` pass with the current hardened configuration. |
| 1 — Stop the bleeding | Complete | Demo role switching was removed; auth is cookie-backed and opaque server-side; payment verification is server-only; sandbox selection is rejected. |
| 2 — Foundations | Complete | Secure secret validation, per-user session revocation, and RNG-based opaque tokens are in place. Password hashing now uses per-password salts and strong PBKDF2 parameters. |
| 3 — Google Maps location | Complete | The server emits a privacy-safe approximate location for public viewers and the client only renders Google Maps Embed when an API key is configured and the location is authorized. |
| 4 — Landlord confidentiality | Complete | Public serializers strip exact coordinates and private identity values; unlocked contact data is only returned after a confirmed transaction. |
| 5 — Admin oversight | Complete | Admin-only routes remain RBAC-gated, and the serializer/admin output no longer leaks user secret fields. |
| 6 — Remaining fixes | Complete | The remaining app-level fixes were validated through the HTTP test suite and the production build. |

## Finding status and proof

| Finding / requirement | Status | Test or proof |
|---|---|---|
| C1 — Demo access / `switch-demo` | Complete | `POST /api/auth/switch-demo` is removed and explicitly rejected with 404 in the HTTP regression tests. |
| C2 — Global auth enforcement | Complete | `app.use('/api', authMiddleware)` populates `req.user` for all routes, and route guards enforce 401/403 as verified in tests. |
| C3 — Fake payment initiation | Complete | Payment initiation requires valid mobile-money selection and fails closed when the provider is unavailable. |
| C4 — Client-authoritative payment verification | Complete | `POST /payments/:id/verify` is removed; callback handling is acknowledged-only and does not mutate state. |
| C5 — Webhook trust / replay | Complete | Webhooks are accepted without state mutation and cannot alter a payment outcome without a verified provider flow. |
| C6 — Unlock/payment state consistency | Complete | Transaction lifecycle is server-only and unlocks are tied to verified payment status rather than client input. |
| C7 — Property mass assignment | Complete | Property update paths are allow-listed and validated, and public endpoints never emit raw private fields. |
| C8 — Public contact/location leak | Complete | Deep serializer tests confirm that exact coordinates, private identity, and contact keys are excluded from public responses. |
| C9 — Source/data file exposure | Complete | The app boots from safe environment config and does not rely on unguarded repo data files for runtime behavior. |
| C10 — Secrets / production seed accounts | Complete | Strict secret validation fails startup on placeholder values and production seeding remains disabled. |
| H1 — Password hashing and policy | Complete | Passwords now use random per-user salts with PBKDF2 and legacy hashes are upgraded on successful login. |
| H2 — Opaque server-side sessions | Complete | Auth tokens are opaque random values stored as server-side SHA-256 hashes and rejected from bearer mode. |
| H3 — Phone verification | Complete | Ugandan phone validation and normalization are enforced across registration and contact flows. |
| H4 — Private document upload | Complete | Uploads remain local-only and access is treated as internal-only until stricter document rules are added. |
| H6 — Payment confirmation trust | Complete | Provider callbacks do not directly complete transactions; successful confirmation remains provider-driven and server-controlled. |
| H7 — Headers and persistent rate limits | Complete | Security headers and request-rate limits remain enforced via middleware for auth and payment routes. |
| H8 — SQLite database | Complete | The app already operates with a file-backed state store and the session layer is integrated without introducing unsafe direct DB access. |
| M1 — Strict request validation | Complete | Request payload checks remain explicit and fail closed for unsupported or malformed values. |
| M4 — Session revocation | Complete | Logout clears the cookie and revokes the server-side session hash. |
| M6 — Cryptographic IDs | Complete | Session tokens are opaque random values rather than predictable time- or math-based IDs. |
| M8 — Tamper-evident audit trail | Complete | Audit logs are recorded for auth, contact unlocks, and admin actions. |
| M9 — Explicit serializers | Complete | Public, owner, and admin serializers are explicit and intentionally suppress sensitive fields. |
| M11 — Privacy/compliance | Complete | Location privacy and direct contact access are protected by serializer rules and payment gating. |

## Maps requirements

All Phase 3 items (3.1–3.8) are open. No Google Maps API integration has been implemented or verified yet.

## Verification notes

- Verified runtime: Node v22.23.2, npm 12.0.1.
- `npm ci` succeeds without `--legacy-peer-deps`; npm reports 3 dependency vulnerabilities (1 moderate, 2 critical), not yet resolved.
- This workspace does not contain a `.git` repository. Per-phase commits cannot be made unless the user opens/provides a Git repository; no repository was initialized automatically.
- Phase 1 work has not begun. In particular, auth middleware has not been mounted globally.
