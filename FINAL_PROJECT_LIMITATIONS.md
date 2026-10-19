# SmartCampus: System Limitations, Technical Constraints & Production Readiness Gaps

## Comprehensive Disclosure of Known System Limitations & Future Enhancements

---

### 1. Emergency Notification & External SMS Gateway Limitations
- **Current Architecture:**
  - Emergency notification logic in `server/src/services/emergencyNotificationService.ts` dispatches alerts to hardcoded safety mobile numbers (`9952911217`, `6382373918`) when high-risk or women safety complaints are filed.
- **Limitation:**
  - In local development and non-configured environments, actual cellular SMS transmission is not performed. The system records the dispatch log with status `'SIMULATED_DEV'` in development and `'UNAVAILABLE_NO_GATEWAY'` in production.
  - No telecom provider (e.g., Twilio, AWS SNS, MSG91) account is bound to the repository.
- **Academic Review Clarification:**
  - The system demonstrates the complete detection, masking, and auditing flow for emergency notifications, but does not claim real cellular delivery without paid provider credentials.

---

### 2. File Storage & Media Persistence Limitations
- **Current Architecture:**
  - File uploads (complaint photos and technician resolution proof) are handled by `multer` and saved directly to the local filesystem directory: `server/uploads/`.
- **Limitation:**
  - In containerized deployments (Docker / Kubernetes) or serverless environments, local disk storage is ephemeral. Any container restart or redeployment without a persistent host volume will result in broken image URLs.
  - There is no automated image compression, WebP transcoding, or thumbnail generation pipeline.
- **Production Requirement:**
  - Future production releases must integrate cloud object storage (e.g., AWS S3, Cloudflare R2, Google Cloud Storage) or map `server/uploads/` to a persistent Docker volume mount.

---

### 3. Background Job Concurrency & Distributed Scaling
- **Current Architecture:**
  - The SLA escalation worker (`escalationService.ts`) and preventive maintenance scheduler (`maintenanceSchedulerService.ts`) use Node.js `setInterval` timers with in-memory boolean locks (`isEscalationRunning`, `isSchedulerRunning`).
- **Limitation:**
  - In-memory locks only protect against overlapping runs within a single Node.js process.
  - If the backend is horizontally scaled across multiple instances (e.g., clustered behind NGINX or running multiple container replicas), each instance will execute its own scheduler timers, causing duplicate database queries and potential race conditions.
- **Production Requirement:**
  - Multi-instance production deployments require a distributed job queue and locking mechanism, such as BullMQ or Agenda backed by Redis.

---

### 4. Database Deployment & Local Standalone Constraints
- **Current Architecture:**
  - The application is configured to connect to a local standalone MongoDB instance (`mongodb://127.0.0.1:27017/smart_campus_db`).
- **Limitation:**
  - Local standalone MongoDB provides no high availability, automatic failover, or geo-redundancy.
  - The current seed setup does not enforce transport layer security (TLS/SSL) for database connections.
- **Production Requirement:**
  - Public production deployment requires a multi-node replica set (such as MongoDB Atlas) with enforced TLS/SSL and encrypted connection strings (`mongodb+srv://...`).

---

### 5. Sustainability & Resource Efficiency Metrics
- **Current Architecture:**
  - The Sustainability & Lifecycle module calculates resource efficiency, energy impact, and water waste indicators based on standard institutional equipment metrics and operating hours.
- **Limitation:**
  - These metrics are derived from equipment specifications and maintenance logs rather than real-time hardware telemetry from physical IoT smart meters (e.g., Modbus power meters, ultrasonic flow sensors).
- **Academic Review Clarification:**
  - The figures represent explainable mathematical projections designed to guide facility decision-making, not live physical sensor measurements.

---

### 6. Client-Side Bundle Size & Code-Splitting
- **Current Architecture:**
  - The React frontend compiles with Vite into a single minified JavaScript bundle (`dist/assets/index-*.js`, ~539 kB).
- **Limitation:**
  - Vite generates a warning indicating the bundle exceeds 500 kB after minification because all admin tabs (Asset Management, Maintenance Intelligence, Lifecycle Sustainability) are bundled statically.
- **Remediation Plan:**
  - Future optimization should introduce dynamic `React.lazy()` imports for admin tabs to achieve route-level code splitting and reduce initial page load times.
