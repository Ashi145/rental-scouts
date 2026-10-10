# Rental Scout — Database Schema Documentation

The application uses SQLite through `better-sqlite3`. Relational entities are stored in separate tables with primary keys, unique constraints, indexes, and foreign keys; property subdocuments (location, amenities, images, and video) are stored as JSON columns. The default file is `var/rentalscout.sqlite`, configurable with `DATABASE_PATH`.

The database enables WAL mode and foreign-key enforcement. When the SQLite database is empty, the server imports legacy records from `data/rentalscout_store.json` or the former JSON file `var/rentalscout.db`; legacy data is retained or moved to a `.legacy.json` backup if it occupied the configured database path. Back up the database using a SQLite-aware procedure rather than copying only the main file while the application is running.

## 1. Entities & Relational Design

The database schema is organized across normalized entities:

### `User`
- `id`: Unique identifier (e.g. `usr_...`)
- `email`: Normalized unique user email
- `passwordHash`: PBKDF2 / Argon2 cryptographic hash with salt
- `fullName`: User display name
- `phone`: Normalized Ugandan phone format (`+256...`)
- `role`: `TENANT` | `LANDLORD` | `ADMIN`
- `isActive`: Boolean flag for suspension
- `createdAt`, `updatedAt`, `lastLoginAt`

### `LandlordProfile`
- `id`: Profile ID
- `userId`: Foreign key to `User.id`
- `businessName`: Optional registered trading name
- `verificationStatus`: `UNVERIFIED` | `PENDING` | `VERIFIED` | `REJECTED` | `SUSPENDED`
- `nationalIdNumberMasked`: Server-side masked NIN (e.g. `CM98****1290K`)
- `ownershipProofType`: Type of ownership document presented (Title, Mailo Agreement, LC1 Letter)
- `publicContactPhone`: Phone number revealed upon verified unlock
- `whatsappEnabled`: Boolean
- `bio`: Landlord background statement

### `Property`
- `id`: Unique listing ID
- `landlordId`: Foreign key to `User.id`
- `title`, `slug`, `description`
- `propertyType`: `SINGLE_ROOM` | `STUDIO` | `1_BEDROOM` | `2_BEDROOM` | `3_BEDROOM` | `APARTMENT` | `HOUSE`
- `monthlyRentUGX`: Integer (e.g. 650000)
- `securityDepositUGX`: Integer
- `bedrooms`, `bathrooms`, `squareMeters`, `furnished`
- `location`: Composite object with `district`, `cityOrTown`, `neighborhood`, `mainRoadReference`, `distanceFromMainRoadMeters`, coordinates
- `images`: Array of image objects with primary flag and captions
- `video`: Optional video tour link
- `status`: `DRAFT` | `PENDING_REVIEW` | `APPROVED` | `REJECTED` | `RENTED`
- `viewCount`, `unlockCount`, `favoriteCount`

### `PaymentTransaction`
- `id`: Unique transaction record
- `tenantId`: Foreign key to `User.id`
- `propertyId`: Foreign key to `Property.id`
- `landlordId`: Foreign key to `Landlord.id`
- `amountUGX`: Fixed at 5,000 UGX
- `currency`: 'UGX'
- `provider`: `MTN_MOMO` | `AIRTEL_MONEY` | `SANDBOX`
- `internalReference`: e.g. `RS-TX-20261005-AB12`
- `providerTransactionId`: External carrier transaction ID
- `status`: `PENDING` | `PROCESSING` | `SUCCESS` | `FAILED` | `CANCELLED`
- `payerPhoneMasked`: Tokenized phone representation
- `idempotencyKey`: Unique client/server idempotency key

### `ContactUnlock`
- `id`: Unique unlock grant
- `tenantId`: Foreign key
- `propertyId`: Foreign key
- `transactionId`: Foreign key to `PaymentTransaction.id`
- `amountUGX`: 5,000
- `revealedPhone`: Stored landlord contact snapshot
- `revealedLandlordName`: Name snapshot
- `whatsappEnabled`: Boolean

### `Report`
- `id`, `reporterUserId`, `propertyId`, `landlordId`, `reason`, `description`, `status` (`OPEN`, `INVESTIGATING`, `RESOLVED`, `DISMISSED`)

### `AuditLog`
- `id`, `actorUserId`, `actorEmail`, `actorRole`, `action`, `targetType`, `targetId`, `createdAt`

## 2. Backup Strategy
- Daily snapshot of the database state to encrypted cold storage.
- Transaction logs retained for 7 years for financial compliance.
