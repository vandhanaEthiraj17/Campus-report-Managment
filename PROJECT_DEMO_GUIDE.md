# SmartCampus: Live Project Demonstration & College Evaluation Guide

## Practical Walkthrough for Mini-Project Review & Viva Voce

---

### 1. Prerequisites
Before running the demonstration, verify that the following tools are installed:
- **Node.js:** v18.0.0 or higher (v20+ recommended). Check with `node -v`.
- **npm:** v9.0.0 or higher. Check with `npm -v`.
- **MongoDB:** MongoDB Community Server (v6.0 or v7.0) running locally on port `27017`.
  - Windows Service Check: `Get-Service MongoDB` in PowerShell.
  - Or verify connectivity via MongoDB Compass / Mongosh.

---

### 2. Environment Configuration

#### Backend Configuration (`server/.env`):
Ensure `server/.env` exists (copy from `server/.env.example` if needed):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smart_campus_db
JWT_SECRET=super_secret_jwt_key_for_smart_campus_evaluation_2026
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

#### Frontend Configuration (`client/.env`):
Ensure `client/.env` exists (copy from `client/.env.example` if needed):
```env
VITE_API_URL=http://localhost:5000/api/v1
```

---

### 3. Database Initialization & Demo Accounts

To populate the local MongoDB database with realistic academic data (buildings, classrooms, assets, pre-approved students and faculty), run:

```bash
cd "server"
npm run seed
npm run import-campus-data
```

#### Verified Demo Credentials:

| Role | Username / Identifier | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@campus.edu` | `admin123` | Full Campus Control, Assets, Analytics, CSV Export |
| **Maintenance Staff** | `staff@campus.edu` | `staff123` | Assigned Work Orders, Repair Proof, Recommendations |
| **Faculty Member** | `FAC-CSE-001` (or `faculty@campus.edu`) | `faculty123` | Academic Issues, Priority Lab Reporting |
| **Student** | `6176AC21UCS143` (or `student@campus.edu`) | `student123` | Issue Reporting, Upvoting, Verification, Anonymous Mode |

---

### 4. Starting the Application

#### Terminal 1 — Backend API Service:
```bash
cd "c:\Users\lenovo\OneDrive\Desktop\Mini Project\server"
npm run dev
```
*Expected Output:*
```
[Database] MongoDB Connected: 127.0.0.1:27017/smart_campus_db
[Scheduler] SLA Escalation Background Worker active.
[Scheduler] Preventive Maintenance Background Worker active.
[Server] SmartCampus Backend running on port 5000.
```

#### Terminal 2 — Frontend Client Portal:
```bash
cd "c:\Users\lenovo\OneDrive\Desktop\Mini Project\client"
npm run dev
```
*Expected Output:*
```
VITE v8.1.5  ready in 300 ms
➜  Local:   http://localhost:3000/
```

Open `http://localhost:3000/` in any modern web browser (Google Chrome or Microsoft Edge recommended).

---

### 5. Suggested Demonstration Sequence for College Review

#### Step 1: Authentication & Pre-Approved Student Registration (2 mins)
1. Navigate to `http://localhost:3000/`.
2. Demonstrate that outsiders cannot register arbitrary accounts without valid institutional credentials.
3. Sign in as Student using `student@campus.edu` / `student123`.

#### Step 2: Student Issue Reporting & Community Upvoting (3 mins)
1. In the Student Portal, click **"Report New Campus Issue"**.
2. Select **Location:** *Main Block $\to$ 1st Floor $\to$ Room 101*.
3. Select **Category:** *Electrical & Lighting*.
4. Select optional linked asset (e.g., *Ceiling Fan 01*).
5. Toggle **"Report Anonymously"** to demonstrate privacy protection.
6. Submit ticket. Show that it immediately appears with ticket ID (e.g., `CMP-2026-XXXX`).
7. Demonstrate upvoting on other public tickets to highlight community priority scaling.

#### Step 3: Admin Command Center & Dispatch (3 mins)
1. Switch account or sign in as Admin (`admin@campus.edu` / `admin123`).
2. Point out the real-time KPIs: Total Reported, Active Work Orders, SLA Breaches.
3. Open the newly submitted complaint in the **Complaints & Dispatch** tab.
4. Note that for the anonymous ticket, reporter name displays as *"Anonymous Reporter"* with PII hidden.
5. Assign the ticket to **Electrical Department** and technician **Robert Miles**.

#### Step 4: Maintenance Technician Execution & Proof-of-Work (3 mins)
1. Sign in as Staff (`staff@campus.edu` / `staff123`).
2. View the task under **Assigned Tasks**.
3. Click the task, start work (status transitions to *In Progress*).
4. Click **"Resolve Work Order"**:
   - Enter repair notes: *"Replaced worn-out capacitors and tested circuit voltage."*
   - Upload repair photo proof.
   - Submit resolution. Status moves to **Resolved**.

#### Step 5: Student Verification & Two-Phase Closure (2 mins)
1. Sign back in as Student (`student@campus.edu`).
2. Notice the notification badge indicating the ticket has been resolved.
3. Open the ticket detail: view the technician's repair notes and visual proof.
4. Click **"Verify & Close"**: submit a 5-star rating and positive feedback.
5. Demonstrate that the ticket transitions to **Closed** and cannot be tampered with.

#### Step 6: Campus Assets & Preventive Maintenance (3 mins)
1. Sign in as Admin $\to$ Click **"Campus Assets & Maintenance"** tab.
2. Show the inventory of 15+ physical campus assets across Main Block, Science Block, and IT Wing.
3. Open an asset dossier (e.g., *Laboratory Air Conditioner*):
   - Show service history, linked complaints, and warranty details.
4. Demonstrate scheduling a preventive maintenance task.

#### Step 7: Explainable Maintenance Intelligence (3 mins)
1. Switch to the **"Maintenance Intelligence"** tab.
2. Highlight the **Asset Health Scores (0–100)**:
   - Click an asset to show the transparent deduction factors (Age penalty, Open issues deduction, Overdue penalty).
3. Show the **Campus Recurring Hotspots**:
   - Highlight buildings and rooms with frequent electrical or plumbing breakdowns.
4. Show active **Recommendations** (e.g., *"Schedule Overdue Service"*, *"Warranty Eligible Claim"*).
5. Demonstrate linking a recommendation directly to a maintenance work order.

#### Step 8: Sustainability & Financial Cost Analytics (3 mins)
1. Click the **"Lifecycle & Sustainability"** tab.
2. Present the financial breakdown: Cumulative expenditure separated by Labour, Parts, and Operational costs.
3. Show the 6-month expenditure trend graph.
4. Show the **Repair-versus-Replacement Assessment**:
   - Highlight assets flagged with *High Maintenance Burden* where cumulative repair costs have exceeded 50% of the purchase price.
5. Click **"Export Expenditure CSV"**:
   - Open downloaded CSV in Excel/Notepad.
   - Demonstrate that formula injection characters (`=`, `+`, `-`, `@`) are safely escaped, and student personal data is excluded.

---

### 6. Troubleshooting Common Demonstration Issues

| Issue | Root Cause | Immediate Remediation |
| :--- | :--- | :--- |
| **"Failed to fetch complaints" or Network Error** | Backend server is not running on port 5000. | Check Terminal 1 and restart with `npm run dev` in `server/`. |
| **MongoDB connection error on startup** | Local MongoDB service is stopped. | Run `net start MongoDB` in an Administrator PowerShell window. |
| **Login fails with "Invalid credentials"** | Local database is unseeded. | Run `npm run seed` and `npm run import-campus-data` in `server/`. |
| **Missing images on complaint cards** | Browser cache or deleted files in `server/uploads/`. | Seed includes fallback campus icons and public campus stock photos. |
| **CORS error in browser console** | Frontend origin port mismatch. | Verify `CLIENT_URL=http://localhost:3000` in `server/.env`. |
