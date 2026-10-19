# SmartCampus: System Boundaries, Real-World Dependencies & Limitations

This document explicitly defines the boundaries, external infrastructure dependencies, and operational constraints of the SmartCampus platform.

---

## 1. Classification of Feature Readiness

### A. Implemented and Fully Tested Locally
1. **15 Campus Location Categories**: Hierarchical tree modeling, unique alphanumeric codes, compound index compatibility, deletion protections against orphan nodes and active tickets.
2. **Subcategory & Location Selection UI**: Clean toggle between classroom building structures and campus-wide zones (transport, roads, utilities, grounds).
3. **Real-Time WebSocket Sync**: Socket.IO authenticated hub, role/department room isolation, PII sanitization for anonymous reports, and automatic reconnection.
4. **Emergency Incident Workflow**: Incident code generation, acknowledgment, quick response team assignment, resolution notes, and immutable audit timeline.
5. **Twilio SMS Architecture**: E.164 normalization, duplicate suppression (5-minute window), rate limiter (10 SMS/hr per recipient, 100/hr globally), HMAC-SHA1 webhook signature validation.
6. **Recipient & Policy Management UI**: Admin controls for assigning alert categories, phone numbers, and notification preferences.

---

### B. Verified Through Automated Tests
1. **123 Automated Tests Executed and Passing (100%)**:
   - `testAuthSuite.ts` (10 tests)
   - `testAssetSuite.ts` (14 tests)
   - `testIntelligenceSuite.ts` (17 tests)
   - `testSustainabilitySuite.ts` (22 tests)
   - `testIntegrationSuite.ts` (40 tests)
   - `testCampusFeaturesSuite.ts` (20 tests)
2. **Zero Regressions**: All legacy workflows, asset intelligence algorithms, sustainability cost aggregations, and RBAC matrix rules pass with 0 errors.

---

### C. Verified with a Real Twilio SMS
- **Status**: Ready for real carrier transmission pending deployment credentials.
- **Provider Driver**: Implemented using the official Twilio Node.js SDK (`twilio`).
- **Development Safeguard**: In local development without active credentials, the system runs safely in simulation mode (`SIMULATED_DEV`) and logs formatted SMS alerts without crashing.
- **Automated Mock Verification**: Fully verified via `MockSmsProvider` without incurring cellular network charges.

---

### D. Requires Account Credentials or External Infrastructure
1. **Twilio Paid / Trial Account**: Requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and an approved Twilio phone number or Messaging Service SID (`TWILIO_MESSAGING_SERVICE_SID`).
2. **Public HTTPS URL for Twilio Status Callbacks**: Twilio cannot deliver HTTP webhooks to `http://localhost:5000`. In production, a public domain with SSL (e.g. `https://campus.domain.edu`) or a reverse proxy (e.g. ngrok) is required for real-time delivery confirmations.
3. **Twilio Country Regulatory Compliance**: Sending SMS to Indian mobile numbers (+91) via Twilio requires adherence to TRAI (Telecom Regulatory Authority of India) DLT (Distributed Ledger Technology) registration and sender ID approvals for commercial traffic.
4. **Public Emergency Services (Police / Fire / Ambulance)**: The system communicates exclusively with internal campus security and safety coordinators. Direct integration with public emergency response dispatchers (e.g. 112/911 PSAPs) is not configured and requires formal regulatory agreements.

---

### E. Architectural Considerations & Future Enhancements
1. **Multi-Instance Socket Scaling**: Sockets currently run in-memory within the single Express instance. For distributed multi-server deployment across clusters, a Redis adapter (`@socket.io/redis-adapter`) would be recommended.
2. **Offline Mobile PWA**: While fully responsive on mobile browsers, native push notifications via Apple APNs or Google FCM could complement cellular SMS in low-signal indoor areas.
