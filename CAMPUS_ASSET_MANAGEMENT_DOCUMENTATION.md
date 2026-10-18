# SmartCampus – Campus Asset Management & Preventive Maintenance

## 1. Executive Summary
This document provides complete technical documentation for the **Campus Asset Management and Preventive Maintenance Module** integrated into the **SmartCampus** intelligent issue reporting and infrastructure analytics system.

---

## 2. Architecture & Workflows

### A. Asset Registration & Inventory Workflow
1. **Privilege & Authentication**: Only administrators authenticated with JWT and possessing the `ADMIN` role can create, modify, or decommission campus equipment.
2. **Location Cascading**: Assets are tied directly to the physical campus hierarchy (`Building` → `Floor` → `Room`). When registered, the system automatically checks and links with the centralized `Location` collection.
3. **Identifier Enforcement**: Assets require a unique `assetCode` (e.g. `AST-MB-101-01`). If omitted, the system generates a standardized alphanumeric identifier matching the building, room, and sequence.
4. **Maintenance Interval**: Configurable cycle (`maintenanceFrequencyDays`, default 90 days). The system automatically initializes `nextMaintenanceDate = baseDate + (maintenanceFrequencyDays * 86,400,000)`.
5. **Auditing**: Every create, edit, or decommissioning action is logged to the MongoDB `AuditLog` collection with actor details and modified fields.

### B. Complaint-to-Asset Relationship
1. **Optional Hardware Tagging**: When reporting an issue via `NewComplaintModal`, selecting an asset is optional. General infrastructure concerns (e.g., lighting, corridor cleaning) can be filed without an asset.
2. **Location-Matching Verification**: When a user selects or provides an asset:
   - The backend checks that the asset exists.
   - The backend verifies that the asset's registered `building`, `floor`, and `room` match the complaint location.
   - If there is a mismatch, the complaint creation is rejected with a `400 Bad Request` explaining the location discrepancy.
3. **Telemetry & Tracking**:
   - The complaint stores the asset reference (`asset`), `assetCode`, and `assetName`.
   - The asset's `complaintCount` is automatically incremented in MongoDB.
   - If a high/urgent priority complaint is logged on an active asset, the asset status transitions to `IN_REPAIR`.
   - The complaint detail view prominently renders the tagged asset badge, condition, and equipment details.

### C. Preventive Maintenance Workflow
1. **Task Scheduling**: Authorized administrators schedule maintenance tasks with an explicit status (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `OVERDUE`).
2. **Technician Assignment**: Tasks are assigned to staff members by ID and department. Technicians can view tasks assigned to them or their department in their task queue.
3. **Execution & Evidence**:
   - Staff starts the task (`IN_PROGRESS`), which transitions the asset to `UNDER_MAINTENANCE`.
   - Staff completes the task, submitting `workDescription`, `conditionAfter` (EXCELLENT, GOOD, FAIR, POOR, CRITICAL), optional `partsReplaced`, `cost`, and photo proof.
4. **Lifecycle Synchronization**: Upon completion:
   - Asset's `lastMaintenanceDate` is set to the completion timestamp.
   - Next preventive maintenance date is recalculated: `nextMaintenanceDate = now + (frequency * 86,400,000)`.
   - Asset condition is updated to `conditionAfter`.
   - Asset status returns to `ACTIVE`.

---

## 3. Database Models

### `Asset` Model (`server/src/models/Asset.ts`)
| Field | Type | Attributes | Description |
|---|---|---|---|
| `assetCode` | String | Required, Unique, Trim, Uppercase | Primary campus asset code |
| `assetName` | String | Required, Trim | Human-readable asset name |
| `assetType` | Enum | Enum (PROJECTOR, AIR_CONDITIONER, LAB_EQUIPMENT, etc.) | Asset category taxonomy |
| `category` | String | Required, Trim | Issue category linkage |
| `building` | String | Required, Trim | Campus building name |
| `floor` | String | Required, Trim | Floor level |
| `room` | String | Required, Trim | Room number / specific spot |
| `location` | ObjectId | Ref: `Location` | Central location record reference |
| `manufacturer` | String | Optional, Trim | Manufacturer brand |
| `modelNumber` | String | Optional, Trim | Model number |
| `serialNumber` | String | Optional, Trim | Serial number |
| `installationDate` | Date | Optional | Date commissioned |
| `warrantyExpiryDate`| Date | Optional | Warranty end date |
| `status` | Enum | ACTIVE, IN_REPAIR, UNDER_MAINTENANCE, DECOMMISSIONED | Operational status |
| `condition` | Enum | EXCELLENT, GOOD, FAIR, POOR, CRITICAL | Equipment physical condition |
| `maintenanceFrequencyDays` | Number | Default: 90 | Preventative maintenance cycle in days |
| `lastMaintenanceDate` | Date | Optional | Most recent completed maintenance |
| `nextMaintenanceDate` | Date | Indexed | Scheduled next maintenance date |
| `assignedDepartment` | String | Optional | Service department |
| `assignedStaff` | ObjectId | Ref: `User` | Assigned technician |
| `complaintCount` | Number | Default: 0 | Number of complaints linked to this asset |
| `lastReminderSentAt` | Date | Optional | Background scheduler notification throttler |

### `MaintenanceRecord` Model (`server/src/models/MaintenanceRecord.ts`)
| Field | Type | Attributes | Description |
|---|---|---|---|
| `recordId` | String | Required, Unique, Uppercase | Human-readable record ID (e.g. `MNT-2026-9102`) |
| `asset` | ObjectId | Ref: `Asset`, Required | Linked asset document ID |
| `assetCode` | String | Required | Cached asset code |
| `assetName` | String | Required | Cached asset name |
| `maintenanceType` | Enum | PREVENTIVE, CORRECTIVE, INSPECTION, EMERGENCY | Nature of maintenance |
| `scheduledDate` | Date | Required | Scheduled maintenance date |
| `completedDate` | Date | Optional | Actual completion timestamp |
| `assignedStaff` | ObjectId | Ref: `User` | Assigned technician |
| `workDescription` | String | Required | Work description / scope |
| `partsReplaced` | String | Optional | Spare parts and components replaced |
| `cost` | Number | Default: 0 | Repair / servicing cost in INR (₹) |
| `conditionAfter` | Enum | EXCELLENT, GOOD, FAIR, POOR, CRITICAL | Post-service condition |
| `beforeImages` | String[] | Default: `[]` | Inspection photos before work |
| `afterImages` | String[] | Default: `[]` | Completion proof photos |
| `status` | Enum | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, OVERDUE | Current execution state |
| `reminderSent` | Boolean | Default: `false` | Duplicate reminder flag |

---

## 4. API Endpoints

### Asset Management (`/api/v1/assets`)
| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/api/v1/assets` | Authenticated | List/search assets with filters (`building`, `room`, `category`, `status`, `condition`, `maintenanceNeeded`, `warrantyExpired`, `repeatedComplaints`) |
| `GET` | `/api/v1/assets/analytics` | `ADMIN` | Database-driven asset analytics (counts, completion rate, building & category demand) |
| `GET` | `/api/v1/assets/:id` | Authenticated | Retrieve asset details, linked complaint history, and maintenance records |
| `POST` | `/api/v1/assets` | `ADMIN` | Register new campus asset |
| `PUT` | `/api/v1/assets/:id` | `ADMIN` | Update asset details, recalibrating next maintenance date |
| `DELETE` | `/api/v1/assets/:id` | `ADMIN` | Decommission asset (soft delete with status `DECOMMISSIONED`) |

### Preventive Maintenance (`/api/v1/maintenance`)
| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `POST` | `/api/v1/maintenance/schedule` | `ADMIN` | Schedule preventive or corrective maintenance task |
| `GET` | `/api/v1/maintenance/tasks` | `ADMIN`, `STAFF` | Retrieve maintenance tasks (Staff sees assigned/department tasks; Admin sees all) |
| `PATCH` | `/api/v1/maintenance/:id/start` | `ADMIN`, `STAFF` | Mark task as `IN_PROGRESS` and asset as `UNDER_MAINTENANCE` |
| `POST` | `/api/v1/maintenance/:id/complete` | `ADMIN`, `STAFF` | Record maintenance completion, condition, parts, cost, and advance asset dates |
| `PATCH` | `/api/v1/maintenance/:id/cancel` | `ADMIN` | Cancel maintenance task and revert asset status |

---

## 5. Background Maintenance Scheduler (`maintenanceSchedulerService.ts`)
- **Execution Interval**: Initial check on server boot and recurring every 15 minutes.
- **Overdue Task Identification**: Automatically identifies records where `status: 'SCHEDULED'` and `scheduledDate < now`, transitioning them to `OVERDUE` and setting `reminderSent = true`.
- **Preventive Maintenance Task Queueing**: Automatically checks active assets whose `nextMaintenanceDate <= now` without an active task, generating a routine preventive maintenance record.
- **Duplicate Prevention**: Updates `asset.lastReminderSentAt` and verifies existing open tasks to prevent duplicate maintenance tasks or notification spam across multiple worker cycles.

---

## 6. Test Suite & Validation
Automated verification is implemented in `server/src/utils/testAssetSuite.ts`:
- **Test 1**: Asset creation and validation (Admin).
- **Test 2**: Duplicate asset code rejection (`400 Bad Request`).
- **Test 3**: Asset editing and retrieval.
- **Test 4**: Role-based access restrictions (Students blocked from admin endpoints).
- **Test 5**: Complaint-to-asset association with complaintCount increment.
- **Test 6**: Invalid asset and location mismatch rejection (`400 Bad Request`).
- **Test 7**: Preventive maintenance scheduling.
- **Test 8**: Overdue maintenance identification and status transition.
- **Test 9**: Maintenance completion and asset date/condition synchronization.
- **Test 10**: Maintenance history persistence in asset detail API.
- **Test 11**: Real MongoDB aggregate analytics.
- **Test 12**: Duplicate reminder prevention across consecutive worker cycles.
- **Test 13**: Backward compatibility with existing complaints without asset links.
- **Test 14**: Regression tests for authentication and student complaint verification.

**Results**: All 14 tests executed and passed (100% pass rate).
