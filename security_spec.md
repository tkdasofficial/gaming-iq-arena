# Gaming IQ Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Default Deny**: All unmatched paths under `/databases/{database}/documents` are rejected by a catch-all `allow read, write: if false;` rule.
2. **PII Isolation**: User email addresses exist ONLY inside `/users/{userId}`, which is strictly restricted to `isOwner(userId) || isAdmin()` for `get` and `isOwner(userId)` for `create`/`update`, with `allow list: if false;`. Public `/presets`, `/brands`, `/chipsets`, `/devices`, and `/game_compatibility` documents never store PII.
3. **Owner & Author Integrity**:
   - Under `/users/{userId}/savedSetups/{setupId}`, `/users/{userId}/customDevices/{deviceId}`, and `/users/{userId}/aimLabRuns/{runId}`, `ownerId` MUST equal `request.auth.uid` on create and remain immutable on update.
   - Under `/presets/{presetId}`, `authorId` MUST equal `request.auth.uid` on create and remain immutable on update.
4. **Admin-Controlled Smartphone Intelligence Database**:
   - `/brands/{brandId}`, `/chipsets/{chipsetId}`, `/devices/{deviceId}`, and `/game_compatibility/{compatId}` are publicly readable only where `visibility == 'public'` (no PII) and writable ONLY by verified admins (`isAdmin()`).
   - `/devices/{deviceId}` strictly enforces `deviceType == 'smartphone'` and `releaseYear >= 2023`, rejecting tablets, laptops, smartwatches, and feature phones.
5. **Path ID Hardening**: All document ID path variables (`userId`, `setupId`, `deviceId`, `runId`, `presetId`, `brandId`, `chipsetId`, `compatId`) MUST pass `isValidId(id)` (`^[a-zA-Z0-9_\-]+$` and length `<= 128`) on single-document operations (`get`, `create`, `update`, `delete`).
6. **Temporal Integrity**: `createdAt` MUST equal `request.time` on create and remain immutable on update. `updatedAt` MUST equal `request.time` on create and update.
7. **Privilege Escalation Prevention**: Users creating `/users/{userId}` MUST supply `role == 'player'` and CANNOT modify `role`, `uid`, or `createdAt` on update. Admin actions require verified email (`request.auth.token.email_verified == true`) and either an `/admins/{uid}` document or the bootstrapped admin email.
8. **Strict Schema, Array Guarding & Size Bounds**: Every document checks `keys().hasAll(...)` and `keys().hasOnly(...)` on create, and `affectedKeys().hasOnly(...)` on update, with explicit type, list bounds (`size() <= MAX` and index-0 element validation), and `.size()` checks matching `firebase-blueprint.json`.

## 2. "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Write**: Creating `/users/u1/savedSetups/s1` or `/devices/d1` with `request.auth == null`.
2. **Unverified Email Spoof**: Creating `/devices/d1` or `/brands/b1` claiming `request.auth.token.email == 'tusharkantidasofficial@gmail.com'` while `request.auth.token.email_verified == false`.
3. **Self-Assigned Admin Role**: Creating `/users/u1` with `{ role: 'admin', uid: 'u1', ... }`.
4. **Non-Admin Smartphone DB Mutation**: A verified player attempting to create or update `/brands/{id}`, `/chipsets/{id}`, `/devices/{id}`, or `/game_compatibility/{id}`.
5. **Cross-Tenant Ownership Spoof**: User `u1` creating `/users/u2/savedSetups/s1` or setting `ownerId: 'u2'` inside `/users/u1/savedSetups/s1`.
6. **Shadow / Ghost Field Injection**: Creating `/devices/d1` or `/users/u1/savedSetups/s1` with an extra `isFeatured: true` or `adminOverride: true` key.
7. **Value Poisoning / Non-Smartphone Rejection**: Writing `/devices/t1` with `deviceType: 'tablet'`, `releaseYear: 2021`, `display.sizeInches: 11.0`, or oversized `sources` (> 5 entries).
8. **ID Poisoning**: Creating `/devices/bad..id..with..slashes` or a 300-character document ID (`!isValidId(deviceId)`).
9. **Client Timestamp Forgery**: Creating `/brands/b1` or `/users/u1/savedSetups/s1` with `createdAt` set to a client-chosen timestamp instead of `request.time`.
10. **Immutable Field Tampering**: Updating `/devices/d1` or `/presets/p1` to mutate `id` or `createdAt`.
11. **PII Cross-User Read / Blanket User List**: User `u1` attempting `get` on `/users/u2` or `list` on `/users`.
12. **Unfiltered List / Non-Public Catalog Query**: Attempting `list` on `/devices`, `/brands`, `/chipsets`, `/game_compatibility`, or `/presets` without matching `visibility == 'public'`.
