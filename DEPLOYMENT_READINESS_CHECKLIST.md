# SmartCampus: Production Deployment & Readiness Manual

This document outlines the deployment requirements, operational architecture, environment configurations, and security practices for deploying the **SmartCampus** Issue Reporting, Maintenance Management, and Infrastructure Analytics Platform.

---

## 1. System Architecture Overview

```
                        ┌──────────────────────────────────────────────┐
                        │              Client Layer                    │
                        │   React 19 + TypeScript + Vite + Tailwind    │
                        │   (Hosted on CDN / Nginx / Static Host)      │
                        └──────────────────────┬───────────────────────┘
                                               │ HTTPS / REST API
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │          API Gateway / Reverse Proxy         │
                        │           (Nginx / Cloudflare / ALB)         │
                        │   - SSL/TLS Termination                      │
                        │   - Rate Limiting                            │
                        │   - Static File Caching (/uploads, assets)   │
                        └──────────────────────┬───────────────────────┘
                                               │ Reverse Proxy (Port 5000)
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │              Backend Service                 │
                        │        Node.js + Express + TypeScript        │
                        │   - Role-Based Access Control (RBAC)         │
                        │   - File Upload Sanitization (Multer)        │
                        │   - Background Workers (SLA, Preventive Mnt) │
                        │   - Health Probe: GET /api/v1/health         │
                        └──────────────────────┬───────────────────────┘
                                               │
                        ┌──────────────────────┴───────────────────────┐
                        │                                              │
                        ▼                                              ▼
        ┌───────────────────────────────┐              ┌───────────────────────────────┐
        │       Primary Database        │              │     External Integrations     │
        │   MongoDB Replica Set (Atlas) │              │  - Twilio / AWS SNS (SMS)     │
        │   - Indexed Collections       │              │  - Campus Excel Member Sync   │
        │   - Daily Snapshot Backups    │              │                               │
        └───────────────────────────────┘              └───────────────────────────────┘
```

---

## 2. Pre-Deployment Configuration Checklist

### A. Environment Configuration (`server/.env`)

Ensure the production environment variables are properly populated. **Never commit `.env` to Git.**

| Variable Name | Required | Example Production Value | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **YES** | `production` | Enables production security guards, disables demo overrides |
| `PORT` | **YES** | `5000` | Local port for the Express application server |
| `CLIENT_URL` | **YES** | `https://campus.edu,https://smartcampus.edu` | Whitelisted frontend origins for CORS |
| `MONGODB_URI` | **YES** | `mongodb+srv://app_user:SECURE_PASS@cluster0.net/smart_campus_prod?retryWrites=true&w=majority` | Authenticated MongoDB connection string |
| `JWT_SECRET` | **YES** | `Minimum 32 random characters (e.g. openssl rand -hex 32)` | Cryptographic signature secret for JWT sessions |
| `COLLEGE_EMAIL_DOMAIN` | Optional | `@campus.edu` | Approved domain for college accounts |
| `EMERGENCY_ALERT_NUMBERS` | **YES** | `99529112177,6382373918` | HOD and security coordinator phone numbers |
| `TWILIO_ACCOUNT_SID` | Optional | `ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` | External cellular telecom gateway account |
| `TWILIO_AUTH_TOKEN` | Optional | `your_auth_token` | Telecom gateway authentication token |
| `TWILIO_PHONE_NUMBER` | Optional | `+1XXXXXXXXXX` | Dedicated sender phone number for cellular SMS |

### B. Client Configuration (`client/.env.production`)

| Variable Name | Required | Example Production Value | Purpose |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Optional | `/api/v1` (or `https://api.campus.edu/api/v1`) | Base URL for Axios client requests |

---

## 3. Build & Artifact Generation

### Step 1: Verify TypeScript & Regression Suites
Execute the master regression suite prior to creating release bundles:
```bash
cd server
npm run test:all
```
*Expected Result: 5 test suites (Auth, Assets, Intelligence, Sustainability, Integration) passing 100%.*

### Step 2: Compile Backend Application
```bash
cd server
npm run build
```
*Produces compiled JavaScript files in `server/dist/`.*

### Step 3: Compile Frontend Production Bundle
```bash
cd client
npm run build
```
*Produces optimized minified HTML, CSS, and JS chunks in `client/dist/`.*

---

## 4. Production Hosting & Process Management

### Backend Node.js Deployment (PM2 Process Manager)
Install PM2 globally on the application host:
```bash
npm install -g pm2
```

Start the application with clustering and production flags:
```bash
cd server
NODE_ENV=production pm2 start dist/app.js --name "smart-campus-api" -i max --max-memory-restart 500M
pm2 save
pm2 startup
```

### Health & Readiness Probes
The backend exposes a standardized health probe:
- **Endpoint**: `GET /api/v1/health`
- **Success Response (HTTP 200)**:
  ```json
  {
    "status": "OK",
    "database": "CONNECTED",
    "service": "Smart Campus Issue Management API",
    "environment": "production",
    "timestamp": "2026-10-19T00:30:00.000Z",
    "uptimeSeconds": 1420
  }
  ```
- **Degraded Response (HTTP 503)**:
  Returned if MongoDB connectivity is lost. Configure Docker, Kubernetes, or load balancer health checks to poll this endpoint every 15-30 seconds.

---

## 5. Storage & Upload Persistence

File uploads (complaint images, repair proof, audio notes) are written to the local filesystem at `server/uploads/`.

### Critical Persistence Rules for Containers / Cloud VMs:
1. **Persistent Volumes**: When deploying with Docker or Kubernetes, mount a persistent volume (`PV`/`PVC`) to `/app/uploads`. Ephemeral container filesystems will lose student repair proof on container restarts.
2. **Permissions**: Ensure the process user (`node`) has write access (`chmod 755 uploads`).
3. **Backup Requirement**: Configure automated incremental daily backups (e.g. AWS S3 sync or EBS snapshots) of the `uploads/` directory.

---

## 6. Database Maintenance & Backup Strategy

### Automated MongoDB Backups (`mongodump`)
Set up a daily automated cron task on the database server:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mongodump --uri="$MONGODB_URI" --gzip --archive="$BACKUP_DIR/smartcampus_$TIMESTAMP.gz"
find "$BACKUP_DIR" -type f -name "smartcampus_*.gz" -mtime +30 -delete
```

### Performance Indexes
Verify all required indexes are loaded:
```bash
db.complaints.getIndexes()
db.assets.getIndexes()
db.maintenancerecords.getIndexes()
db.recommendations.getIndexes()
```
*Compound indexes include `{ isEscalated: 1, slaDueDate: 1 }`, `{ status: 1, priority: 1 }`, and `{ asset: 1, status: 1 }`.*

---

## 7. Emergency SMS Gateway Activation

The system defaults to a safe **Development Simulation Mode** where emergency SMS alerts are dispatched to the server audit history without attempting unauthorized cellular transmissions.

To activate **live carrier delivery** to emergency contact numbers (`99529112177`, `6382373918`):
1. Create an institutional account with a licensed telecom SMS provider (e.g. Twilio, AWS SNS, MSG91).
2. Configure provider keys in `server/.env`:
   - `TWILIO_ACCOUNT_SID=AC...`
   - `TWILIO_AUTH_TOKEN=...`
   - `TWILIO_PHONE_NUMBER=+1...`
3. Verify DLT (Distributed Ledger Technology) registration and campus template approval if deploying within Indian telecom regulations.
