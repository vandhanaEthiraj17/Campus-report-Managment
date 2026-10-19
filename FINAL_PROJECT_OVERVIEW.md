# SmartCampus: Intelligent Campus Issue Reporting, Maintenance Management & Infrastructure Analytics System

## Final Project Overview & Technical Architecture Document

---

### 1. Problem Statement
Educational institutions and university campuses face recurring operational challenges in managing facilities, electrical infrastructure, sanitary assets, and IT equipment. Traditional manual logging methods (physical complaint registers, unmonitored WhatsApp/email groups) suffer from critical vulnerabilities:
- **Lack of Accountability & Visibility:** Students and faculty have no visibility into the progress or technician dispatch for reported campus issues.
- **Duplicate Issue Chaos:** Multiple individuals independently report identical classroom or hostel breakdowns (e.g., broken projectors, power outages), flooding maintenance queues.
- **Absence of Asset Lifespan Tracking:** Colleges often replace expensive machinery prematurely or fail to perform routine preventive maintenance, leading to catastrophic equipment breakdowns.
- **Privacy Gaps in Sensitive Issues:** Students reporting harassment, hygiene complaints, or ragging face intimidation when personal details are exposed.
- **Zero Actionable Intelligence:** Traditional databases accumulate static ticket logs without calculating equipment health scores, recurring failure hotspots, or maintenance expenditure trends.

---

### 2. Project Objectives
SmartCampus solves these challenges through an integrated, data-driven campus maintenance and infrastructure intelligence platform:
1. **End-to-End Lifecycle Automation:** Streamline issue reporting, automated departmental routing, technician dispatch, proof-of-work submission, and student verification.
2. **Intelligent Duplicate Resolution:** Group identical issues using location-category-proximity hashing and community upvoting.
3. **Privacy-Preserving Reporting:** Enable cryptographically secure anonymous complaints where student names and register numbers are masked across the platform.
4. **Campus Asset & Preventive Maintenance:** Model physical equipment with maintenance schedules, overdue triggers, and complete historical service logs.
5. **Rule-Based Maintenance Intelligence:** Continuously score asset health (0–100) using deterministic penalty models, detect recurring failure hotspots, and generate explainable proactive recommendations.
6. **Sustainability & Cost Governance:** Track parts, labour, and operational expenditures, assess repair-versus-replacement feasibility, and export sanitized reports resistant to CSV injection.

---

### 3. Technology Stack

| Layer | Technologies Used | Key Libraries & Specifications |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS | Lucide React, Axios, Canvas Confetti, Oxlint |
| **Backend** | Node.js (v20+), Express.js, TypeScript | TSX, Zod, Multer, Bcrypt.js, JsonWebToken |
| **Database** | MongoDB (v7.0+), Mongoose ODM | Schema validation, Compound Indexes, Aggregation Pipeline |
| **Authentication** | JWT (JSON Web Tokens), Bcrypt Password Hashing | 24-hour expiration, Bearer Authorization Header |
| **Access Control** | Role-Based Access Control (RBAC) | STUDENT, FACULTY, STAFF, ADMIN |
| **Security Controls** | Input Sanitization, MIME-type Whitelisting | CWE-1236 CSV Injection defense, File extension verification |

---

### 4. Major System Modules

1. **Authentication & Identity Verification:**
   - Pre-approved campus roster verification using Institutional Register Number and Date of Birth (DOB).
   - Secure self-registration, credential hashing with bcrypt (10 rounds), and JWT issuance.
2. **Complaint Management & Dispatch Workflow:**
   - Multi-step reporting wizard with location cascading (Building $\to$ Floor $\to$ Room), category tagging, priority assessment, and media evidence upload.
   - Dual-mode reporting: Standard Named vs. Zero-Leakage Anonymous.
3. **Staff Task Allocation & Work Order Execution:**
   - Department-filtered work queues for Electrical, Plumbing, IT Infrastructure, Civil, and Estate teams.
   - Technician resolution with mandatory repair notes and before/after visual proof.
4. **Student Verification & Reopening Loop:**
   - Two-phase closure: Tickets enter "Resolved" until original student reporter verifies with 1–5 star rating or rejects with an escalation reason.
5. **Campus Asset Management:**
   - Register equipment with serial numbers, warranty expiry dates, purchase values, and maintenance cycle frequencies.
   - Automatic bi-directional linking between campus complaints and physical assets.
6. **Preventive Maintenance Engine:**
   - Background interval worker detecting overdue maintenance, queueing recurring tasks, and updating asset operational health.
7. **Maintenance Intelligence & Recommendation Engine:**
   - Explainable 0–100 health scoring algorithm, recurring complaint hotspot detection, and deduplicated actionable recommendations.
8. **Sustainability Analytics & Lifecycle Tracking:**
   - Real-time financial expenditure computation (Labour + Parts + Other), repair-versus-replacement decision support, and sanitized CSV data export.

---

### 5. System Users and Role Permissions

```
+-----------------------------------------------------------------------------------+
|                                 ROLE PERMISSION MATRIX                            |
+-------------------+-----------------+-----------------+-------------+-------------+
| Feature / Action  | Student         | Faculty         | Staff       | Admin       |
+-------------------+-----------------+-----------------+-------------+-------------+
| Submit Complaint  | Full Access     | Priority Tagged | Prohibited  | Prohibited  |
| Upvote Issues     | Full Access     | Full Access     | Prohibited  | Prohibited  |
| Verify & Rate     | Own Tickets     | Own Tickets     | Prohibited  | Prohibited  |
| Update Work Order | Prohibited      | Prohibited      | Assigned    | Full Access |
| Asset Registry    | Read Public     | Read Public     | Read Dept   | Full CRUD   |
| Sched. Mnt.       | Prohibited      | Prohibited      | Prohibited  | Full Access |
| Intelligence Recs | Prohibited      | Prohibited      | Review/Addr | Full CRUD   |
| Financial Costs   | Prohibited (403)| Prohibited (403)| Prohibited  | Full Access |
| User Provisioning | Prohibited (403)| Prohibited (403)| Prohibited  | Full Access |
+-------------------+-----------------+-----------------+-------------+-------------+
```

---

### 6. System Architecture & Component Diagram

```
+-----------------------------------------------------------------------------+
|                                CLIENT BROWSER                               |
|  React 19 + TypeScript + Tailwind CSS                                       |
|  [Student Portal]     [Faculty Portal]     [Staff Desk]    [Admin Command]  |
+--------------------------------------+--------------------------------------+
                                       | HTTP / REST (Axios + JWT Bearer)
                                       v
+-----------------------------------------------------------------------------+
|                             EXPRESS BACKEND API                             |
|  Controllers: Auth | Complaint | Asset | Maintenance | Intel | Sustainability|
|  Middlewares: authMiddleware (JWT Verification & RBAC Guard)                 |
|               Multer Upload Engine (25MB Limit + MIME Validation)            |
|  Background Workers: SLA Escalation Service | Maintenance Scheduler Service  |
+--------------------------------------+--------------------------------------+
                                       | Mongoose ODM
                                       v
+-----------------------------------------------------------------------------+
|                              MONGODB DATABASE                               |
|  Collections: users | complaints | assets | maintenancerecords              |
|               recommendations | locations | categories | auditlogs          |
|  Indexes: Compound { isEscalated: 1, slaDueDate: 1 }, AssetCode, TicketId   |
+-----------------------------------------------------------------------------+
```

---

### 7. Main Data Flows

#### Flow 1: Complaint Reporting, Resolution & Verification
1. **Reporting:** Student submits issue $\to$ Controller validates location, category, and optional asset $\to$ DB creates record with status `Reported` and calculated SLA due date.
2. **Dispatch:** Admin assigns ticket to Department/Technician $\to$ Status becomes `Assigned`.
3. **Execution:** Technician updates status to `In Progress` $\to$ Upon completion, posts repair notes and photo evidence to `/resolve` $\to$ Status becomes `Resolved`.
4. **Closure:** Student inspects repair $\to$ Submits feedback rating (1–5) to `/verify` $\to$ Status transitions to `Closed`. (If rejected, returns to `In Progress` with priority escalated).

#### Flow 2: Asset Intelligence & Preventive Maintenance
1. **Data Ingestion:** System aggregates complaints and completed maintenance records linked to an asset.
2. **Health Calculation:** Rule engine applies penalty deductions for age, open complaints, and overdue maintenance $\to$ Derives score (0–100).
3. **Recommendation Generation:** If health $< 60$ or maintenance is overdue, creates explainable recommendation record $\to$ Deduplication logic prevents duplicate entries.
4. **Task Scheduling:** Admin reviews recommendation $\to$ Links to scheduled maintenance work order.

---

### 8. Security & Privacy Features
- **Zero PII Exposure on Anonymous Complaints:** Reporter identity, email, and register numbers are stripped from API payloads for non-administrative roles.
- **CWE-1236 CSV Injection Defense:** All exported CSV fields starting with formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped with leading single quotes.
- **Password Protection:** Encrypted using industry-standard bcrypt hashing with a salt factor of 10. Plaintext credentials are never persisted.
- **Tamper-Resistant Status Transitions:** Only authorized roles can advance complaint workflow states. Direct status alteration by unprivileged users is rejected with 403 Forbidden.
- **Strict File Upload Constraints:** File size capped at 25MB with strict file extension and MIME-type validation.

---

### 9. Current System Limitations
1. **Simulated External SMS Gateway:** Emergency phone notifications are logged and simulated; real cellular SMS requires commercial Twilio/AWS SNS credentials.
2. **In-Memory Concurrency Locks:** Scheduler execution locks operate in-process; horizontal multi-instance scaling requires distributed locks (e.g., Redis).
3. **Local Storage for Media:** Uploaded files reside in `server/uploads/`; production containerization requires persistent volume mounts or cloud object storage.
4. **Calculated Sustainability Metrics:** Energy and water conservation figures are derived from standard institutional benchmarks rather than physical IoT sensors.
