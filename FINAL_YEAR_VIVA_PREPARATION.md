# SmartCampus: Comprehensive Final-Year Viva Voce Preparation Guide

## 30 Core Technical Questions & Source-Code Verified Answers for Mini-Project Review

---

### SECTION 1: ARCHITECTURE & FULL-STACK INTEGRATION

#### Q1: What is the high-level architecture of the SmartCampus system?
**Answer:** SmartCampus follows a modern decoupled client-server architecture. The frontend is a Single-Page Application (SPA) built with React 19, TypeScript, and Vite, styled using Tailwind CSS. The backend is a RESTful API service built with Node.js, Express.js, and TypeScript. Data persistence and analytical aggregations are handled by MongoDB using the Mongoose Object Data Modeling (ODM) library. Communication occurs over HTTP/HTTPS using JSON payloads, authenticated with JSON Web Tokens (JWT).

#### Q2: Why did you choose React with TypeScript over plain JavaScript?
**Answer:** TypeScript provides static compile-time type checking, catching type errors (such as missing object properties or incorrect function arguments) before runtime. In our project, shared TypeScript interfaces (e.g., `IComplaint`, `IAsset`, `IRecommendation`, `IUser`) ensure strict contracts between backend API responses and frontend components, eliminating undefined property errors during UI rendering.

#### Q3: Why did you select MongoDB over a relational database like PostgreSQL?
**Answer:** Campus complaints and maintenance records have dynamic, hierarchical attributes: complaints possess varying location structures (Building $\to$ Floor $\to$ Room), timeline arrays with progressive audit events, and variable media evidence arrays. MongoDB's document model natively supports embedded arrays and subdocuments (such as `timeline` and `resolutionDetails`), avoiding complex multi-table joins. Furthermore, MongoDB's Aggregation Pipeline provides high-performance grouped analytics for monthly maintenance expenditures and location hotspot detection.

---

### SECTION 2: AUTHENTICATION, SECURITY & RBAC

#### Q4: How is authentication implemented in the system?
**Answer:** Authentication uses stateless JSON Web Tokens (JWT). When a user logs in with their credentials, the backend validates the password against a bcrypt hash stored in MongoDB. Upon verification, the server generates a signed JWT containing the user's `id`, `role`, and `department` with a 24-hour expiration (`expiresIn: '24h'`). The client stores this token in `localStorage` and includes it in the `Authorization: Bearer <token>` header for subsequent requests via an Axios interceptor.

#### Q5: How is Role-Based Access Control (RBAC) enforced on the backend?
**Answer:** RBAC is enforced through Express middleware in `server/src/middlewares/authMiddleware.ts`. The `authMiddleware` first verifies the signature and expiration of the JWT using `jsonwebtoken`. Next, role-guard middleware such as `requireRole(['ADMIN'])` or `requireRole(['ADMIN', 'STAFF'])` checks whether the decoded `req.user.role` matches the permitted roles. If unauthorized, it immediately returns `403 Forbidden` before the request reaches the controller.

#### Q6: How does the system prevent arbitrary self-registration by unauthorized outsiders?
**Answer:** In `server/src/controllers/authController.ts`, self-registration requires validation against an institutional pre-approved campus member roster (`ApprovedCampusMember` collection, imported from verified college Excel records). A user must provide an exact matching Register Number (or Faculty ID) and Date of Birth (DOB). If the details do not match the roster, the server rejects registration with a 400 Bad Request error.

#### Q7: How is anonymous reporting handled without compromising accountability?
**Answer:** When `isAnonymous: true` is selected, the database retains the reporter's user reference internally to prevent spamming and allow duplicate upvoting. However, when complaints are queried by students, faculty, or staff, the complaint controller checks the user's role and replaces the reporter's name with `"Anonymous Reporter"` while completely omitting `reporterUserId`, `email`, and `registerNumber` from the JSON payload. Only Super Administrators can view the underlying reporter in audit emergencies.

#### Q8: What is CSV Formula Injection (CWE-1236) and how does your project mitigate it?
**Answer:** CSV Formula Injection occurs when an exported spreadsheet file contains cells starting with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`). If opened in software like Microsoft Excel, the spreadsheet may execute malicious commands or exfiltrate data. Our project mitigates this in `server/src/services/csvExportService.ts` by checking the first character of every string field; if it begins with any formula character, it is automatically escaped with a leading single quote (`'`), rendering it as harmless plain text.

---

### SECTION 3: COMPLAINT LIFECYCLE & WORKFLOW ENGINE

#### Q9: What are the lifecycle states of a campus complaint?
**Answer:** A complaint transitions through the following finite state machine:
1. `Reported`: Initial submission by student or faculty.
2. `Assigned`: Administrator has allocated the ticket to a maintenance department and technician.
3. `In Progress` / `Accepted`: Technician has acknowledged and started physical repair work on site.
4. `Resolved`: Technician has completed work and submitted repair notes with photographic proof.
5. `Closed`: Original student reporter has inspected the repair, verified satisfaction with a 1–5 star rating, or Administrator has closed it.

#### Q10: How does the two-phase verification and reopening loop work?
**Answer:** A technician cannot directly mark a complaint as `Closed`. Submitting repair evidence moves the ticket to `Resolved`. The original reporter receives an alert and can either:
- **Verify & Rate (1–5 Stars):** Transitions ticket to `Closed`, persisting student feedback.
- **Reject Repair:** If the repair is defective, the student clicks "Reopen" with an explanation. The ticket returns to `In Progress`, increments a reopening counter, and escalates its priority.

#### Q11: How is Service Level Agreement (SLA) escalation monitored?
**Answer:** When a complaint is created, `complaintController.ts` computes an `slaDueDate` based on priority:
- High / Emergency: 24 hours.
- Medium: 48 hours.
- Low: 72 hours.
A background worker (`escalationService.ts`) runs on a recurring interval. It queries unclosed tickets where `slaDueDate < new Date()` and `isEscalated: false`, marks `isEscalated: true`, increments priority, appends an SLA breach audit event to the timeline, and logs an alert.

#### Q12: How does duplicate issue detection and community upvoting function?
**Answer:** When creating a complaint, the system queries for existing active tickets sharing the same `location` and `category`. If a match is detected, the frontend alerts the user to upvote the existing ticket instead of creating a duplicate. Each upvote increments the ticket's `upvotes` counter, signaling high community impact to administrators.

---

### SECTION 4: CAMPUS ASSET MANAGEMENT & PREVENTIVE MAINTENANCE

#### Q13: What attributes are modeled in the Campus Asset schema?
**Answer:** The `Asset.ts` Mongoose schema models:
- `assetCode`: Unique identifier (e.g., `AST-MAIN-AC-01`).
- `name` & `category`: Description and classification (HVAC, Electrical, IT Hardware, Plumbing).
- `location`: Reference to `Location` model (Building, Floor, Room).
- `status`: `ACTIVE`, `UNDER_MAINTENANCE`, `RETIRED`.
- `condition`: `EXCELLENT`, `GOOD`, `FAIR`, `POOR`, `CRITICAL`.
- `purchaseDate`, `purchaseCost`, `warrantyExpiryDate`.
- `maintenanceFrequencyDays`: Standard service interval (e.g., 90 days).
- `lastMaintenanceDate` & `nextMaintenanceDate`.
- `complaintCount`: Cumulative linked issues.

#### Q14: How are campus complaints linked to physical equipment assets?
**Answer:** When filing a complaint in a room containing registered assets, the user can select the specific asset from a dropdown. The backend validates that the asset is actually located in that room (rejecting mismatches with 400 Bad Request). Upon submission, the complaint stores the `asset` ObjectId, and the asset's `complaintCount` is atomically incremented.

#### Q15: How does the preventive maintenance scheduler work?
**Answer:** `maintenanceSchedulerService.ts` executes an interval worker. It queries assets where `nextMaintenanceDate <= new Date()` and no active maintenance record is currently in progress. It automatically creates a new `MaintenanceRecord` with `taskType: 'PREVENTIVE'`, updates the asset status to `UNDER_MAINTENANCE`, and alerts the facility department. Once the technician completes the service, the asset's `lastMaintenanceDate` is updated and `nextMaintenanceDate` is advanced by `maintenanceFrequencyDays`.

---

### SECTION 5: RULE-BASED MAINTENANCE INTELLIGENCE ENGINE

#### Q16: How is the Asset Health Score (0–100) calculated?
**Answer:** Asset health is calculated deterministically in `maintenanceIntelligenceService.ts` starting from a baseline score of 100:
$$\text{Health Score} = 100 - (\text{Age Deduction}) - (\text{Complaints Deduction}) - (\text{Maintenance Deduction}) - (\text{Condition Deduction})$$
- **Age Penalty:** $2 \text{ pts} \times \text{years in service}$ (capped at 20).
- **Complaints Penalty:** $10 \text{ pts} \times \text{active complaints} + 3 \text{ pts} \times \text{closed complaints}$ (capped at 40).
- **Maintenance Penalty:** 25 pts if overdue; 10 pts if never maintained.
- **Physical Condition Penalty:** Fair = -10, Poor = -25, Critical = -40.
The final score is clamped between 0 and 100 and classified:
- $80 - 100$: Healthy (Green)
- $60 - 79$: Moderate Attention (Yellow)
- $40 - 59$: High Risk (Orange)
- $0 - 39$: Critical Failure Imminent (Red)

#### Q17: What is the recurring issue hotspot detection algorithm?
**Answer:** The intelligence service executes a MongoDB aggregation pipeline grouping complaints by `location` and `category` over a 30, 60, or 90-day window. If any room or building accumulates $\ge 3$ complaints within the category, it is flagged as a "Recurring Failure Hotspot". The system generates an actionable recommendation for systemic inspection (e.g., investigating building voltage fluctuations when multiple fans burn out in the same block).

#### Q18: How does the recommendation deduplication mechanism prevent spam?
**Answer:** Before creating a recommendation, the system computes a deterministic deduplication key:
$$\text{dedupKey} = \text{assetId} + \text{":"} + \text{recommendationType}$$
It queries the `recommendations` collection for any existing record with that `dedupKey` in `ACTIVE` or `REVIEWED` status. If found, it skips creation, ensuring repeated background evaluations never generate duplicate entries.

#### Q19: Why did you use an explainable rule-based system instead of a black-box Machine Learning model?
**Answer:** In campus infrastructure and educational maintenance, administrators require deterministic, explainable rationale before approving budgets or dispatching technicians. A black-box ML model cannot transparently explain why an asset received a specific score. Our rule-based engine provides explicit penalty factors (e.g., *"Score 65: -10 pts for 5 years age, -25 pts for overdue maintenance"*), which aligns with audit requirements and ensures predictable behavior with zero training data dependencies.

---

### SECTION 6: SUSTAINABILITY & FINANCIAL COST ANALYTICS

#### Q20: How are maintenance expenditures computed?
**Answer:** In `sustainabilityCostService.ts`, when a technician completes a maintenance task, they record three line items:
$$\text{Total Cost} = \text{Labour Cost} + \text{Parts Cost} + \text{Other Expenses}$$
The backend recalculates this sum on the server to prevent client-side price tampering. The data is aggregated using `$group` pipelines to provide monthly spending curves, departmental comparisons, and category distributions.

#### Q21: How are cancelled maintenance tasks handled in financial reporting?
**Answer:** Tasks with status `CANCELLED` are strictly excluded from financial expenditure calculations using `{ status: { $ne: 'CANCELLED' } }` in all MongoDB aggregation pipelines. Including cancelled tasks would artificially inflate institutional expenditure figures.

#### Q22: What is the Repair-versus-Replacement assessment rule?
**Answer:** The system tracks the cumulative maintenance expenditure incurred on an asset over its lifetime and computes the cost-to-purchase ratio:
$$\text{Cost Ratio} = \frac{\sum \text{Maintenance Costs}}{\text{Purchase Cost}} \times 100$$
If this ratio reaches or exceeds **50%**, the asset is flagged under **HIGH MAINTENANCE BURDEN**, generating a recommendation: *"Conduct Replacement Feasibility Review: Cumulative maintenance has exceeded 50% of the asset's original capital cost."*

---

### SECTION 7: TESTING, DEPLOYMENT & LIMITATIONS

#### Q23: What testing methodologies were employed to verify the system?
**Answer:** We implemented a multi-layered automated testing strategy comprising 103 automated tests across 5 dedicated suites:
1. `test:auth` (10 tests): Verification, bcrypt hashing, and RBAC rejection.
2. `test:assets` (14 tests): Asset CRUD, duplicate code rejection, and preventive cycles.
3. `test:intelligence` (17 tests): Health scoring, boundary clamping, and hotspot detection.
4. `test:sustainability` (22 tests): Expenditure math, date filtering, and CWE-1236 sanitization.
5. `test:integration` (40 tests): End-to-end user journeys covering Scenarios A through G.

#### Q24: What are the primary current limitations of the SmartCampus system?
**Answer:**
1. **Telecom SMS Dispatch:** Cellular phone notifications are currently simulated and logged; sending real SMS requires an active commercial Twilio or AWS SNS subscription.
2. **Local File Storage:** Uploaded repair photos are stored on the local server filesystem (`server/uploads/`) rather than an S3/MinIO cloud object bucket.
3. **In-Memory Schedulers:** Background concurrency locks run in-process, which is suitable for single-server setups but requires distributed Redis locks for multi-instance clusters.
4. **IoT Sensor Hardware:** Sustainability metrics (such as water conservation and energy usage) are mathematically calculated from equipment ratings and duty cycles rather than physical smart meters.

#### Q25: How would you scale this application for a university with 50,000+ students?
**Answer:**
1. **Database:** Deploy a multi-node MongoDB replica set with sharding on the `complaints` collection partitioned by `department` or `createdAt` year.
2. **Media:** Offload image uploads to AWS S3 or Cloudflare R2 served via a global Content Delivery Network (CDN).
3. **Caching:** Integrate Redis to cache frequent read-heavy queries (e.g., active campus locations, categories, and analytics overviews).
4. **Distributed Workers:** Replace Node.js in-memory interval timers with BullMQ backed by Redis for fault-tolerant background queue processing.
