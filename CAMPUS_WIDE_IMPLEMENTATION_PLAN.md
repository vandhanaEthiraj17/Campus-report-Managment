# SmartCampus: Campus-Wide Coverage, Real-Time Notifications & Twilio SMS Integration Plan

## Comprehensive Architecture & Engineering Roadmap

---

### 1. Executive Summary & Audit Findings
Following our complete audit of the codebase:
- **Location Structure:** `Location.ts` currently only supports `{ buildingName, floor, roomNumber }` with a rigid compound index. Non-building campus assets (e.g., Campus Roads, Main Gate, Sports Grounds, College Buses, Canteen Kitchens) cannot be represented cleanly without forcing them into a room/floor structure.
- **Emergency Notifications:** `emergencyNotificationService.ts` currently hardcodes two recipient phone numbers (`99529112177`, `6382373918`), performs string-matching on complaint text, and logs simulated dispatches without connecting to a true cellular provider or verifying webhook delivery callbacks.
- **Real-Time Capabilities:** The application relies on HTTP polling and manual component re-fetching upon user actions. There is currently no WebSocket / Socket.IO server layer for instantaneous multi-dashboard synchronization.
- **Existing Tests & Baseline:** All 103 tests across the 5 existing suites pass with 100% success. All new modules must extend and preserve these existing interfaces, ensuring zero regressions.

---

### 2. Implementation Architecture

#### Phase 1: Configurable Campus Location Model & Hierarchical Management
- **Model Extension (`Location.ts`):**
  - Add `code` (unique human-readable identifier, e.g., `LOC-GATE-01`, `ACAD-MAIN-101`, `HOSTEL-B1-F2-204`, `BUS-04`, `ROAD-NORTH-01`).
  - Add `name` (e.g., "Main Security Checkpoint", "Room 101", "Central Cafeteria Kitchen", "Campus Ring Road - North Segment").
  - Add `locationType` (enum covering 15 categories: `SECURITY_CHECKPOINT`, `ACADEMIC_BLOCK`, `LABORATORY`, `OFFICE`, `HOSTEL`, `CANTEEN`, `LIBRARY_AUDITORIUM`, `PARKING`, `TRANSPORT`, `ROAD_PATHWAY`, `SPORTS_GROUND`, `SANITATION`, `OUTDOOR_AREA`, `UTILITY_ROOM`, `OTHER`).
  - Add `structureType` (`ROOM_BASED`, `SEGMENT_BASED`, `VEHICLE_BASED`, `ZONE_BASED`, `STANDALONE`).
  - Add `parentLocation` (self-referencing ObjectId for flexible tree structures like Campus $\to$ Building $\to$ Floor $\to$ Room or Transport $\to$ Bus $\to$ Component).
  - Add `fullPath` (breadcrumb string for rapid searching, e.g., "Main Block > 1st Floor > Room 101").
  - Preserve `buildingName`, `floor`, and `roomNumber` as backward-compatible optional fields so existing code, complaints, assets, and tests continue to work without breaking.
  - Add deletion protection: Prevent deletion of locations referenced by active complaints, assets, or maintenance tasks.
- **Location APIs & Admin UI:**
  - Full CRUD endpoints (`GET /locations`, `POST /locations`, `PATCH /locations/:id`, `DELETE /locations/:id`, `GET /locations/hierarchy`, `GET /locations/:id/unresolved-complaints`).
  - Admin Location Management UI within the Admin Dashboard for viewing hierarchies, adding non-building locations, and monitoring unresolved location tickets.

#### Phase 2: Complete Campus Issue Reporting & Category Expansion
- **Category Extension (`Category.ts`):**
  - Seed and support all required campus facility categories:
    - Electrical
    - Plumbing and Water Supply
    - Civil Maintenance
    - Cleaning and Sanitation
    - Furniture and Classroom Facilities
    - Laboratory Equipment
    - Hostel Facilities
    - Canteen Facilities
    - Parking and Security Infrastructure
    - Bus and Transport Incidents
    - Road, Pathway, and Subway Safety
    - Sports Facilities
    - IT and Networking
    - Emergency and Safety Incidents
    - Other Campus Facilities
- **Complaint Workflow Integration:**
  - Update complaint reporting modal to support selecting either traditional building/floor/room or modern location tree nodes.
  - Automatically populate `locationDetails` and `fullPath`.
  - Maintain duplicate detection and community upvoting across all location types.

#### Phase 3: Real-Time Application Synchronization (Socket.IO)
- **Server WebSocket Engine:**
  - Mount Socket.IO on the Express HTTP server in `server/src/app.ts`.
  - Authenticate socket handshakes using existing JWT tokens (`socket.handshake.auth.token`).
  - Isolate clients into authorized rooms: `user:<userId>`, `role:<ROLE>`, `dept:<DEPARTMENT>`, `emergency:responders`.
  - Implement centralized `socketService.ts` for publishing events:
    - `complaint:created` (broadcasts to admins, relevant department, and creator; masks PII on anonymous complaints).
    - `complaint:assigned` (alerts assigned technician and admin).
    - `complaint:status_changed` (updates ticket creator and admins).
    - `emergency:created`, `emergency:acknowledged`, `emergency:resolved` (instant broadcast to emergency responders).
    - `maintenance:created`, `maintenance:updated`, `asset:status_changed`.
- **Frontend Real-Time Integration:**
  - Create `useSocket` hook and service with automatic reconnection handling and re-fetching on reconnect to avoid stale UI state.

#### Phase 4: Production-Grade Twilio SMS Service & Notification Policy
- **Twilio Provider Engine (`server/src/services/twilioSmsService.ts`):**
  - Modular provider pattern: `ISmsProvider` interface with `TwilioSmsProvider` and `MockSmsProvider`.
  - Credentials loaded strictly from environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`.
  - Strict input validation: E.164 phone number formatting, message length constraints, rate limiting, and deduplication (preventing duplicate SMS for the same event and recipient).
  - Status callback endpoint (`POST /api/v1/notifications/twilio-callback`) validating Twilio request signatures (`X-Twilio-Signature`) to prevent forged delivery updates.
  - Real status mapping: `QUEUED`, `SENT`, `DELIVERED`, `UNDELIVERED`, `FAILED`, `UNAVAILABLE_NO_GATEWAY`.
- **Recipient & Policy Management:**
  - Model `NotificationRecipient.ts` for managing authorized emergency personnel, wardens, security chiefs, and transport managers.
  - Clear notification policies:
    - Normal complaints: Dashboard notification + technician assignment alert + optional student acknowledgement.
    - Emergency incidents: Immediate real-time broadcast + high-priority SMS dispatch + tracking provider message IDs.

#### Phase 5: Emergency Response Workflow & Dedicated Emergency Dashboard
- **Emergency Incident Model (`EmergencyIncident.ts`):**
  - Dedicated collection tracking incident code (`EMG-YYYY-XXXX`), severity (`CRITICAL`, `HIGH`, `MEDIUM`), category, location, reporter (with privacy masking), assigned response team, acknowledgement timestamp, resolution details, and SMS delivery audit logs.
- **Dedicated Emergency Dashboard Tab in Admin Center:**
  - Real-time incident feed, severity filters, location filters, status filters.
  - Interactive actions: "Acknowledge Incident", "Dispatch Security/Medical", "Resolve Incident".
  - Multi-sensory visual cues (badges, priority icons, high-contrast borders) avoiding reliance on color alone.

#### Phase 6: Automated Testing, Documentation & Regression Assurance
- Extend automated test suites with new dedicated test modules:
  - Location hierarchy & deletion protection tests.
  - Socket.IO authentication and room authorization tests.
  - Twilio provider tests (mocked dispatch, signature verification, rate limits, deduplication).
  - Emergency incident lifecycle tests.
- Re-run all 103 existing tests to guarantee zero regressions.
- Prepare all 8 required documentation deliverables.

---

### 3. Risk Mitigation & Safety Constraints
- **Preserve Existing Database Schema:** All existing fields on `Location`, `Complaint`, and `User` remain intact. New attributes are additive or optional.
- **Zero Real SMS Sent During Automated Tests:** The test runner uses the mocked SMS provider interface, preventing charges or accidental real phone spam.
- **Graceful Degradation:** If Socket.IO connection drops, the frontend automatically falls back to standard REST API operations. If Twilio keys are absent, the system truthfully reports `UNAVAILABLE_NO_GATEWAY`.
