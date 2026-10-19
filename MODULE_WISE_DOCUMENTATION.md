# SmartCampus: Module-Wise Technical Specification & Documentation

## Detailed Breakdown of System Modules, APIs, Data Models & Business Logic

---

### MODULE 1: AUTHENTICATION & ACCESS CONTROL (RBAC)

- **Purpose:** Securely identify students, faculty, maintenance staff, and administrators. Prevent unauthorized account creation through pre-approved campus roster validation.
- **Main Screens:**
  - Login Page (`client/src/pages/auth/LoginPage.tsx`)
  - Role-based Dashboard Router (`client/src/App.tsx`)
- **Relevant API Endpoints:**
  - `POST /api/v1/auth/verify-identifier` — Validates institutional Register Number and Date of Birth against pre-approved records.
  - `POST /api/v1/auth/register` — Creates verified account with bcrypt-hashed password.
  - `POST /api/v1/auth/login` — Authenticates credentials, generates JWT session (24h).
  - `GET /api/v1/auth/me` — Returns authenticated user profile and permissions.
- **Data Models:**
  - `User.ts` (`name`, `email`, `password`, `role`, `department`, `registerNumber`, `isActive`)
  - `ApprovedCampusMember.ts` (`identifier`, `dob`, `role`, `name`, `department`)
- **Inputs, Processing & Outputs:**
  - *Input:* Register number (e.g., `6176AC21UCS143`), DOB (`YYYY-MM-DD`), password.
  - *Processing:* Compares DOB against roster; hashes password with bcrypt (salt rounds = 10); signs JWT payload containing `{ id, role, department }`.
  - *Output:* JWT Bearer token and sanitized user profile object.

---

### MODULE 2: COMPLAINT REPORTING & TRACKING

- **Purpose:** Allow campus members to submit, track, and upvote maintenance issues across college facilities with real-time status progression.
- **Main Screens:**
  - Student Dashboard Overview (`client/src/pages/student/StudentDashboard.tsx`)
  - New Issue Wizard Modal (`client/src/components/complaints/NewComplaintModal.tsx`)
  - Complaint Detail & Timeline Modal (`client/src/components/complaints/ComplaintDetailModal.tsx`)
- **Relevant API Endpoints:**
  - `GET /api/v1/complaints` — Paginated and filtered complaints list (by status, department, search, anonymous type).
  - `POST /api/v1/complaints` — Creates new complaint ticket with location, category, priority, and evidence.
  - `GET /api/v1/complaints/:id` — Detailed ticket view including progress history and comments.
  - `POST /api/v1/complaints/:id/upvote` — Upvotes existing complaint, incrementing community priority.
  - `PATCH /api/v1/complaints/:id/status` — State machine transition guard.
- **Data Models:**
  - `Complaint.ts` (`ticketId`, `title`, `description`, `category`, `location`, `priority`, `status`, `reportedBy`, `isAnonymous`, `upvotes`, `slaDueDate`, `timeline`)
- **Inputs, Processing & Outputs:**
  - *Input:* Title, description, building, floor, room number, category, optional asset tag, media files.
  - *Processing:* Generates formatted ticket ID (`CMP-YYYY-XXXX`); calculates SLA window (High: 24h, Medium: 48h, Low: 72h); detects duplicates by location-category matching.
  - *Output:* Persisted complaint document with audit timeline entry.

---

### MODULE 3: ANONYMOUS REPORTING & PRIVACY SHIELD

- **Purpose:** Protect the identity of students and faculty reporting sensitive concerns (e.g., harassment, hostel hygiene, electrical hazards).
- **Relevant API Endpoints & Logic:**
  - Evaluated in `GET /api/v1/complaints` and `GET /api/v1/complaints/:id`.
  - Backend controller checks user role:
    - If `isAnonymous: true` and requestor is not Super Admin:
      - `reportedByName` is replaced with `"Anonymous Reporter"`.
      - `reporterUserId`, `email`, and `registerNumber` are stripped from response.
- **Inputs, Processing & Outputs:**
  - *Input:* Toggle `isAnonymous: true` on submission form.
  - *Processing:* Internal reference stored securely for duplicate prevention; payload sanitized dynamically before serialization.
  - *Output:* Public card displaying anonymous shield badge with zero identifiable PII.

---

### MODULE 4: MAINTENANCE WORK ORDER DISPATCH & REPAIR WORKFLOW

- **Purpose:** Enable administrators to assign work orders and maintenance technicians to execute repairs with mandatory visual proof-of-work.
- **Main Screens:**
  - Admin Work Order Management Tab (`client/src/pages/admin/AdminDashboard.tsx`)
  - Staff Maintenance Queue (`client/src/pages/staff/StaffDashboard.tsx`)
- **Relevant API Endpoints:**
  - `PATCH /api/v1/complaints/:id/assign` — Assigns technician and department.
  - `POST /api/v1/complaints/:id/resolve` — Technician submits resolution notes and photo proof.
  - `POST /api/v1/complaints/:id/verify` — Student verifies resolution with 1–5 star rating or requests reopening.
- **Data Models:**
  - `Complaint.ts` (`assignedTo`, `assignedDepartment`, `resolutionDetails`, `verificationDetails`)
- **Inputs, Processing & Outputs:**
  - *Input:* Assigned technician ID; repair completion notes; resolution image file; student satisfaction score.
  - *Processing:* Enforces status flow: `Assigned` $\to$ `In Progress` $\to$ `Resolved` $\to$ `Closed`. Rejection returns ticket to `In Progress` with priority escalated.
  - *Output:* Closed work order with historical timestamps, technician accountability, and student feedback.

---

### MODULE 5: CAMPUS ASSET MANAGEMENT & PREVENTIVE CYCLES

- **Purpose:** Track physical campus infrastructure (e.g., air conditioners, water purifiers, laboratory equipment, power generators) and automate maintenance scheduling.
- **Main Screens:**
  - Asset Management Dashboard (`client/src/components/admin/AssetManagementTab.tsx`)
- **Relevant API Endpoints:**
  - `GET /api/v1/assets` — Lists assets with status, condition, and maintenance flags.
  - `POST /api/v1/assets` — Registers new asset with code, purchase date, warranty, and maintenance frequency.
  - `GET /api/v1/assets/:id` — Complete asset dossier with linked maintenance tasks and complaints.
  - `POST /api/v1/maintenance` — Schedules preventive maintenance work order.
  - `PATCH /api/v1/maintenance/:id/complete` — Records completed service, parts used, and labor costs.
- **Data Models:**
  - `Asset.ts` (`assetCode`, `name`, `category`, `location`, `status`, `condition`, `purchaseCost`, `maintenanceFrequencyDays`, `nextMaintenanceDate`, `complaintCount`)
  - `MaintenanceRecord.ts` (`recordId`, `assetId`, `taskType`, `scheduledDate`, `completedDate`, `cost`, `status`, `assignedTo`)
- **Inputs, Processing & Outputs:**
  - *Input:* Asset serial number, location room, purchase price, maintenance cycle (e.g., every 90 days).
  - *Processing:* Updates `lastMaintenanceDate`; calculates next service cycle date; increments `complaintCount` upon issue linking.
  - *Output:* Comprehensive equipment history and automated preventive maintenance queue.

---

### MODULE 6: RULE-BASED MAINTENANCE INTELLIGENCE ENGINE

- **Purpose:** Provide explainable, algorithmic health scoring and failure hotspot identification to prevent catastrophic infrastructure downtime.
- **Main Screens:**
  - Maintenance Intelligence Tab (`client/src/components/admin/MaintenanceIntelligenceTab.tsx`)
- **Relevant API Endpoints:**
  - `GET /api/v1/intelligence/overview` — Institutional intelligence KPIs and top failure hotspots.
  - `GET /api/v1/intelligence/health/:id` — Explainable health score breakdown for specific asset.
  - `GET /api/v1/intelligence/recommendations` — Active, deduplicated recommendations.
  - `POST /api/v1/intelligence/recommendations/:id/link-task` — Links recommendation to work order.
- **Core Algorithms:**
  - **Asset Health Score Formula (0 to 100):**
    $$\text{Score} = 100 - (\text{Age Deduction}) - (\text{Complaints Deduction}) - (\text{Maintenance Deduction}) - (\text{Condition Deduction})$$
    - *Age Deduction:* $2 \times \text{Years in Service}$ (max 20 pts).
    - *Complaints Deduction:* $10 \times \text{Active Issues} + 3 \times \text{Closed Issues}$ (max 40 pts).
    - *Maintenance Deduction:* 25 pts if overdue; 10 pts if never serviced.
    - *Condition Deduction:* Fair = 10 pts, Poor = 25 pts, Critical = 40 pts.
  - **Hotspot Detection:** Aggregates complaints by Location and Category over a rolling 30/60/90-day window; flags locations with $\ge 3$ repeated issues.
- **Inputs, Processing & Outputs:**
  - *Input:* Historical asset records, linked complaint counts, maintenance completion logs.
  - *Processing:* Evaluates deterministic rules; checks deduplication keys to prevent spamming duplicate recommendations.
  - *Output:* Prioritized recommendations with transparent explanations and suggested remediation.

---

### MODULE 7: SUSTAINABILITY & FINANCIAL COST ANALYTICS

- **Purpose:** Track campus maintenance expenditures, analyze equipment lifecycle costs, evaluate repair-vs-replacement feasibility, and export secure reports.
- **Main Screens:**
  - Lifecycle & Sustainability Tab (`client/src/components/admin/LifecycleSustainabilityTab.tsx`)
- **Relevant API Endpoints:**
  - `GET /api/v1/sustainability/expenditure` — Total and monthly breakdown of maintenance spending (Labour, Parts, Other).
  - `GET /api/v1/sustainability/lifecycle-summary/:id` — Equipment age, total cumulative maintenance costs, and cost-to-purchase ratio.
  - `GET /api/v1/sustainability/export/csv` — Secure CSV export with formula injection sanitization.
- **Core Business Logic:**
  - **Cost Accumulation:** $\text{Total Cost} = \text{Labour Cost} + \text{Parts Cost} + \text{Other Expenses}$.
  - **Exclusion Rule:** Tasks with status `CANCELLED` are strictly excluded from financial totals.
  - **Repair-versus-Replacement Rule:**
    $$\text{If } \frac{\text{Cumulative Maintenance Cost}}{\text{Purchase Cost}} \ge 0.50 \implies \text{Flag for Replacement Review}$$
  - **CWE-1236 Sanitization:** All cell values starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are prefixed with `'`.
- **Inputs, Processing & Outputs:**
  - *Input:* Filter parameters (date range, building, category).
  - *Processing:* Database aggregation pipelines compute monthly expenditures and resource efficiency metrics.
  - *Output:* Financial trend charts and sanitized CSV file downloads.
