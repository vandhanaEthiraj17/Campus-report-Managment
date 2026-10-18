# SmartCampus: Phase 3 Maintenance Intelligence & Recommendation Engine

## Technical Architecture & Implementation Documentation

### 1. Overview
The **Maintenance Intelligence Recommendation Engine** provides explainable, data-driven equipment telemetry, asset health scoring, recurring failure detection, and automated maintenance recommendations for the SmartCampus facility management platform. 

All algorithms rely on actual database records from MongoDB (`Asset`, `MaintenanceRecord`, and `Complaint`), without opaque machine learning or ungrounded predictive claims.

---

### 2. Asset Health Scoring Formula (0 to 100)

The Asset Health Score is a deterministic indicator calibrated against physical integrity, operating status, unresolved user complaints, preventive hygiene, and historical repair frequency.

#### Baseline
Every active campus asset begins with a baseline score of **100**.

#### Configurable Scoring Factors & Deductions

| Category | Condition / Telemetry State | Impact | Explanation |
|---|---|---|---|
| **Physical Condition** | `CRITICAL` | **-35 pts** | Core component reliability or structural integrity is compromised. |
| | `POOR` | **-20 pts** | Noticeable wear, thermal stress, or degraded performance. |
| | `FAIR` | **-10 pts** | Minor cosmetic or non-critical mechanical degradation. |
| | `EXCELLENT` / `GOOD` | **0 pts** | Normal operational integrity. |
| **Operational Status** | `DECOMMISSIONED` | **-100 pts** | Completely offline; health score clamped to 0. |
| | `IN_REPAIR` | **-15 pts** | Currently disabled undergoing corrective intervention. |
| | `UNDER_MAINTENANCE` | **-5 pts** | Temporarily offline for scheduled servicing. |
| | `ACTIVE` | **0 pts** | Normal operation. |
| **Active Complaints (Unresolved)** | Urgent Priority | **-15 pts/ticket** | Max -30 pts. Severe safety hazard or total outage. |
| | High Priority | **-10 pts/ticket** | Max -20 pts. Critical functional disruption. |
| | Medium / Low Priority | **-5 pts/ticket** | Max -15 pts. Standard operational grievances. |
| **Recurring Incidents** | $\ge 2$ Complaints on Asset | **-10 pts** | Indicates chronic component or power instability. |
| **Overdue Maintenance** | Overdue Maintenance Tasks | **-15 pts/task** | Max -30 pts. Scheduled maintenance window breached. |
| | Calendar Cycle Overdue | **-10 pts** | Next scheduled maintenance date has passed. |
| **Frequent Corrective Repairs** | $\ge 2$ Corrective in Window | **-10 pts** | Component fragility requiring repeated part replacement. |
| **Preventive Hygiene Bonus** | Routine Maintenance Completed | **+5 pts** | Asset completed preventive check within 90 days (`EXCELLENT` or `GOOD` condition). |

#### Clamping & Health Categories
The final score is strictly clamped to $[0, 100]$:
$$\text{Score} = \max(0, \min(100, \text{CalculatedScore}))$$

- **80 – 100 (Healthy)**: Equipment operating reliably within standard maintenance intervals.
- **60 – 79 (Needs Attention)**: Minor operational degradation or upcoming preventive tasks.
- **40 – 59 (At Risk)**: Multiple active complaints, overdue service, or degraded physical condition.
- **0 – 39 (Critical)**: Immediate safety hazard or imminent failure; immediate inspection required.

#### Confidence & Historical Sufficiency
When an asset has 0 complaint tickets and 0 maintenance logs, the engine sets:
- `confidence = 'LOW'`
- `hasLimitedData = true`
- Notes: *"Baseline score based primarily on physical condition. No incident or maintenance records logged yet."*

---

### 3. Recommendation Engine Rules

The engine runs deterministically across all active equipment. Each recommendation generated contains complete supporting evidence, title, explanation, priority, and suggested action:

| Rule Type | Priority | Trigger Condition | Suggested Action |
|---|---|---|---|
| `CRITICAL_CONDITION` | `URGENT` | Asset condition is `CRITICAL`. | Arrange immediate diagnostic inspection; take offline if safety hazard exists. |
| `OVERDUE_PREVENTIVE` | `HIGH` | Next preventive date elapsed or overdue maintenance record exists. | Schedule and assign overdue preventive task immediately. |
| `RECURRING_ELECTRICAL` | `HIGH` | $\ge 2$ complaints matching electrical issues (e.g. spark, voltage, trip, fuse). | Inspect wiring, power capacitor health, ground earthing resistance, and room breaker. |
| `RECURRING_NETWORK` | `MEDIUM` | $\ge 2$ complaints matching network disruptions on router/network asset. | Inspect patch cables, PoE wattage allocation, uplink port error counters, and firmware. |
| `POST_REPAIR_FAILURE` | `HIGH` | New complaint filed within 14 days of maintenance completion. | Conduct root-cause diagnostic instead of repeating symptomatic part replacement. |
| `WARRANTY_ELIGIBLE` | `MEDIUM` | Asset under active manufacturer warranty has open complaint or repair. | Check warranty claim coverage with manufacturer/supplier before authorizing campus budget. |
| `ROUTINE_INSPECTION` | `LOW` | Asset has zero history on record (`hasLimitedData === true`). | Establish routine checklist baseline during next departmental walkthrough. |

#### Stable Deduplication Strategy
To prevent scheduler spam and duplicated work orders:
Before creating any recommendation, the engine checks for existing records matching:
```ts
{
  asset: asset._id,
  recommendationType: ruleType,
  status: { $in: ['OPEN', 'REVIEWED', 'TASK_CREATED'] }
}
```
If an active recommendation already exists, the engine updates the evidence array and current health score rather than inserting duplicate documents.

---

### 4. Staff Scoping & Privacy Enforcement

1. **Role-Based Access Control (RBAC)**:
   - Students: HTTP `403 Forbidden` on all `/api/v1/intelligence/*` routes.
   - Staff: Scoped strictly to equipment and recommendations within their designated department (`staffUser.department`) or assigned to their user ID.
   - Admin: Global campus-wide access, evaluation trigger (`/refresh`), and cross-department delegation.

2. **Anonymous Reporter Privacy**:
   - When recommendations aggregate supporting complaint evidence, student reporter PII is stripped via `sanitizeComplaint()`.
   - Anonymous complaints mask names as `Anonymous Reporter` and omit register numbers, contact numbers, and email addresses.

---

### 5. API Endpoints

All routes mounted at `/api/v1/intelligence`:

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/overview` | ADMIN, STAFF | System-wide health distribution, open recommendations, and overdue tasks. |
| `GET` | `/recurring-issues` | ADMIN, STAFF | Equipment complaint frequency and building/room electrical and network hotspots. |
| `GET` | `/health` | ADMIN, STAFF | Filterable asset health scores with factor breakdowns and data confidence. |
| `GET` | `/health/:id` | ADMIN, STAFF | Single asset health assessment with complete factor deductions and complaint history. |
| `GET` | `/recommendations` | ADMIN, STAFF | Scoped list of active maintenance recommendations. |
| `GET` | `/recommendations/:id` | ADMIN, STAFF | Single recommendation detail with sanitized complaint history. |
| `POST` | `/refresh` | ADMIN | Manually trigger full intelligence evaluation across campus equipment. |
| `PATCH` | `/recommendations/:id/review` | ADMIN, STAFF | Mark recommendation status as `REVIEWED`. |
| `POST` | `/recommendations/:id/link-task` | ADMIN, STAFF | Link a maintenance record to recommendation, setting status to `TASK_CREATED`. |
| `PATCH` | `/recommendations/:id/address` | ADMIN, STAFF | Mark recommendation status as `ADDRESSED`. |
| `POST` | `/recommendations/:id/dismiss` | ADMIN, STAFF | Dismiss recommendation with a required `reason` explanation string. |

---

### 6. Automated Test Suite Results

The automated test suite (`server/src/utils/testIntelligenceSuite.ts`) executed on live MongoDB and Node.js Express API:

| # | Test Scenario | Verified Behavior | Status |
|---|---|---|---|
| **1** | Asset Health Score calculation | Deterministic formula deduction: Fair condition yields exactly 90/100 (`Healthy`). | **PASSED** |
| **2** | Score Boundary Conditions | Clamped strictly between 0 and 100 under extreme deductions and bonuses. | **PASSED** |
| **3** | Missing Historical Data Handling | Zero telemetry correctly flagged with `confidence: 'LOW'` and `hasLimitedData: true`. | **PASSED** |
| **4** | Repeated Complaints for Same Asset | Multiple complaints trigger `-10 pts` repeated complaint penalty factor. | **PASSED** |
| **5** | Closed vs Active Complaints | Closed tickets do not penalize active health; active tickets reduce score. | **PASSED** |
| **6** | Overdue Maintenance Detection | Breached schedule yields `OVERDUE_PREVENTIVE` recommendation with `HIGH` priority. | **PASSED** |
| **7** | Warranty-Aware Recommendations | Active warranty on failing asset triggers `WARRANTY_ELIGIBLE` with OEM info. | **PASSED** |
| **8** | Duplicate Recommendation Prevention | Repeated evaluation passes keep count identical without duplicating open tasks. | **PASSED** |
| **9** | Recommendation Persistence | Documents saved with code, explanation, structured evidence, and suggested action. | **PASSED** |
| **10** | Maintenance Task Linking | Linking maintenance record sets status to `TASK_CREATED` and populates relation. | **PASSED** |
| **11** | Role-Based Access Control | Students blocked (`403`), anonymous blocked (`401`), Admin allowed (`200`). | **PASSED** |
| **12** | Staff Department Scoping | Electrical technicians receive zero recommendations from IT Support. | **PASSED** |
| **13** | Anonymous Reporter Privacy | Related complaint evidence conceals student PII as `Anonymous Reporter`. | **PASSED** |
| **14** | Database-Driven Analytics | Overview metrics and hotspot locations computed directly from MongoDB aggregations. | **PASSED** |
| **15** | Complaint Workflow Regression | Complaint creation, duplicate detection, and ticket generation intact. | **PASSED** |
| **16** | Asset Management Regression | Asset creation, validation, and location checks operate with 100% fidelity. | **PASSED** |
| **17** | Authentication Session Regression | JWT sessions validated; tampered/expired tokens rejected with `403`. | **PASSED** |

**Result: 17 / 17 Tests Passed (100%)**
Existing suites also validated:
- `testAssetSuite.ts`: **14 / 14 Passed**
- `testAuthSuite.ts`: **10 / 10 Passed**
- Client Build (`tsc -b && vite build`): **0 Errors**
