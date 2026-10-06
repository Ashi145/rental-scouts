# Rental Scout — Future Mobile Application Integration Plan

## 1. Unified Backend Architecture

The Rental Scout backend was engineered from the ground up so that an Android (Kotlin / Jetpack Compose) or iOS (Swift / SwiftUI) application can directly connect to the same server infrastructure without duplicating business logic:

1. **Authentication**: Mobile apps use `POST /api/auth/login` and receive a JWT Bearer token stored in encrypted device keystore (`EncryptedSharedPreferences` on Android, `Keychain` on iOS).
2. **REST Endpoints**: Mobile clients consume the exact same `/api/properties`, `/api/payments/initiate`, and `/api/landlord` routes.
3. **Mobile Money Native USSD**: Mobile apps initiate payments via `POST /api/payments/initiate`. Since MTN MoMo and Airtel Money deliver carrier network USSD prompts, the user simply enters their PIN on their device screen, and the mobile app polls `/api/payments/:id/verify`.
4. **Push Notifications**: Future integration will incorporate Firebase Cloud Messaging (FCM) using the existing `/api/notifications` data model.
