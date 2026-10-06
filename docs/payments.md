# Rental Scout — Payment Architecture & Mobile Money Integration

## 1. Overview

Rental Scout monetizes through a **UGX 5,000** contact unlock fee paid by tenants when they want direct telephone and WhatsApp access to a property owner.

## 2. Sequence Diagram

```
Tenant Browser                   Rental Scout Server              Mobile Money Gateway (MTN/Airtel)
     │                                    │                                      │
     │ 1. POST /api/payments/initiate     │                                      │
     ├───────────────────────────────────>│                                      │
     │    (propertyId, phone, method)     │                                      │
     │                                    │ 2. Enforce 5,000 UGX                 │
     │                                    │ 3. Check for existing unlock         │
     │                                    │ 4. Insert PENDING transaction        │
     │                                    │ 5. Initiate USSD push                │
     │                                    ├─────────────────────────────────────>│
     │                                    │                                      │
     │ 6. USSD Prompt Sent                │                                      │
     │<───────────────────────────────────┤                                      │
     │                                    │                                      │
     │ 7. Tenant enters PIN on handset    │                                      │
     │──────────────────────────────────────────────────────────────────────────>│
     │                                    │                                      │
     │                                    │ 8. Webhook / Callback notification   │
     │                                    │<─────────────────────────────────────┤
     │                                    │ 9. Verify HMAC signature             │
     │                                    │ 10. Update status -> SUCCESS         │
     │                                    │ 11. Create ContactUnlock record      │
     │ 12. GET/Verify returns phone       │                                      │
     │<───────────────────────────────────┤                                      │
```

## 3. Environment Variables

Configure in `.env`:

```bash
# Payment Provider Selection: 'sandbox' | 'mtn' | 'airtel'
PAYMENT_PROVIDER=sandbox
PAYMENT_UNLOCK_FEE_UGX=5000
PAYMENT_WEBHOOK_SECRET=your_payment_webhook_hmac_secret

# MTN Mobile Money API Credentials
MTN_MOMO_API_KEY=your_mtn_momo_api_key
MTN_MOMO_API_SECRET=your_mtn_momo_api_secret
MTN_MOMO_SUBSCRIPTION_KEY=your_mtn_momo_subscription_key
MTN_MOMO_TARGET_ENV=sandbox # or 'production'

# Airtel Money API Credentials
AIRTEL_CLIENT_ID=your_airtel_client_id
AIRTEL_API_KEY=your_airtel_money_api_key
AIRTEL_API_SECRET=your_airtel_money_api_secret
```

*Note: Never place real secrets in source control or client code.*

## 4. Key Security Rules

1. **Server Enforces 5,000 UGX**: The backend ignores any amount sent by client requests.
2. **Duplicate Payment Prevention**: If tenant has already unlocked the property, the existing unlock is returned without re-charging.
3. **Idempotency**: Webhooks and verification calls use unique transaction references to prevent duplicate accounting.
