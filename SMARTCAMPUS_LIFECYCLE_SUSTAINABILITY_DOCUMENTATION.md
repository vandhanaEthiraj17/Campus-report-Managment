# SmartCampus: Phase 4 Sustainability Analytics, Maintenance Cost Management & Equipment Lifecycle Tracking

## Technical Architecture & Implementation Documentation

### 1. Executive Summary
Phase 4 introduces an explainable, data-driven financial cost management, equipment lifecycle tracking, and sustainability analytics module to the SmartCampus system.

All metrics are derived directly from persisted MongoDB collections (`Asset`, `MaintenanceRecord`, and `Complaint`). No machine learning heuristics, fabricated carbon offsets, or assumed financial figures are used. When historical dates or purchase prices are missing, the system explicitly marks data as *"Data unavailable"*, maintaining mathematical and audit integrity.

---

### 2. Database Schema Changes

#### A. `Asset` Collection Enhancements ([Asset.ts](file:///c:/Users/lenovo/OneDrive/Desktop/Mini%20Project/server/src/models/Asset.ts))
| Field Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `purchaseCost` | `Number` | Optional, `min: 0` | Original capital acquisition price. |
| `expectedLifespanYears` | `Number` | Optional, `min: 1` | Manufacturer or institutional design operational lifespan in years. |
| `totalMaintenanceCost` | `Number` | Default: `0`, `min: 0` | Idempotent cumulative sum of completed maintenance expenses. |

#### B. `MaintenanceRecord` Collection Enhancements ([MaintenanceRecord.ts](file:///c:/Users/lenovo/OneDrive/Desktop/Mini%20Project/server/src/models/MaintenanceRecord.ts))
| Field Name | Type | Constraints / Default | Description |
|---|---|---|---|
| `labourCost` | `Number` | Default: `0`, `min: 0` | Technician labour expense. |
| `partsCost` | `Number` | Default: `0`, `min: 0` | Cost of replacement spare components. |
| `otherExpenses` | `Number` | Default: `0`, `min: 0` | Incidental supplies, permit fees, or transit charges. |
| `cost` | `Number` | Default: `0`, `min: 0` | Total maintenance task cost, computed and validated by the backend. |
| `relatedComplaint` | `ObjectId` | Optional, Ref: `Complaint` | Links maintenance expenditure directly to the complaint ticket. |

---

### 3. Maintenance Cost Calculation Methodology

1. **Non-Negative Monetary Enforcement**:
   All inputs for `labourCost`, `partsCost`, `otherExpenses`, and `cost` are validated on the backend. Negative values are rejected with `HTTP 400 Bad Request`.

2. **Backend Computation**:
   $$\text{Total Cost} = \text{Labour Cost} + \text{Spare Parts Cost} + \text{Other Expenses}$$
   If breakdown parameters are provided, the backend computes the total and overrides any tampered client-side total.

3. **Idempotent Asset Cumulative Maintenance Sum**:
   When a maintenance task is marked `COMPLETED` via the API, the system executes an aggregation pipeline across all completed records for that asset:
   ```ts
   const costAgg = await MaintenanceRecord.aggregate([
     { $match: { asset: asset._id, status: 'COMPLETED' } },
     { $group: { _id: null, total: { $sum: '$cost' } } }
   ]);
   asset.totalMaintenanceCost = costAgg[0]?.total || 0;
   ```
   This prevents double-counting upon repeated edits or status re-evaluations.

4. **Missing Financial Information Handling**:
   Tasks with `cost === 0` and zero breakdown are separately counted under `missingCostRecordsCount`, ensuring missing financial records are not misinterpreted as free maintenance.

---

### 4. Equipment Lifecycle & Repair vs Replacement Assessment Rules

For each registered campus asset, the engine calculates:
*   **Operating Age (Years)**: Derived from `purchaseDate` or `installationDate`. If missing, returns `null` and formats as `"Data unavailable"`.
*   **Useful Life Remaining (Years)**: If `expectedLifespanYears` is recorded:
    $$\text{Remaining Years} = \max(0, \text{expectedLifespanYears} - \text{Operating Age})$$
*   **Cost-to-Purchase Ratio (%)**:
    $$\text{Cost Ratio} = \left(\frac{\text{totalMaintenanceCost}}{\text{purchaseCost}}\right) \times 100$$

#### Rule-Based Lifecycle Review Flags

| Flag | Trigger Criteria | Urgency | Administrative Recommendation |
|---|---|---|---|
| `HIGH_MAINTENANCE_BURDEN` | `purchaseCost > 0` and $\text{Cost Ratio} \ge 50\%$ | `HIGH` (or `CRITICAL` if $\ge 75\%$) | Conduct replacement feasibility review before allocating additional repair budget. |
| `END_OF_LIFE_EXCEEDED` | $\text{Operating Age} \ge \text{expectedLifespanYears}$ and condition is `POOR` or `CRITICAL` | `HIGH` (or `CRITICAL` if `CRITICAL` condition) | Schedule equipment retirement and request capital expenditure budget for modern replacement. |
| `RECURRING_CORRECTIVE_BURDEN` | $\ge 3$ corrective repairs, condition `POOR` or `CRITICAL`, and `purchaseCost` is missing | `MEDIUM` | Perform root-cause inspection and record purchase price to enable financial threshold analysis. |
| `WARRANTY_ELIGIBLE_SAVINGS` | Asset requires repair, but `warrantyExpiryDate > now` | `MEDIUM` | Submit warranty claim to manufacturer to recover repair costs before using departmental budget. |
| `NORMAL_LIFECYCLE` | Equipment operating within baseline parameters | `LOW` | Continue routine scheduled preventive maintenance. |

---

### 5. Sustainability & Resource Efficiency Indicators

All indicators represent real facility management efficiency:
*   **Preventive Maintenance Completion Rate**:
    $$\text{Compliance Rate} = \frac{\text{Completed Preventive Tasks}}{\text{Completed Preventive} + \text{Overdue Preventive}} \times 100$$
*   **Preventive to Corrective Ratio**:
    $$\text{Ratio} = \frac{\text{Completed Preventive Tasks}}{\max(1, \text{Completed Corrective Tasks})}$$
    A ratio $> 3.0$ reflects a proactive maintenance culture that minimizes premature equipment failure.
*   **Chronic Failure Frequency**:
    Percentage of campus equipment that has required $\ge 2$ corrective interventions.
*   **Maintenance Backlog by Building**:
    Count of overdue maintenance tasks grouped by campus block.
*   **Department Workload & Expenditure**:
    Completed vs. pending task volume and cumulative expenditure by technician department.
*   **IoT Sensor Transparency Notice**:
    The system explicitly states: *"Energy and water IoT smart-meter telemetry is currently offline (no physical sub-meters installed). Sustainability indicators reflect resource efficiency, equipment lifespan optimization, proactive preventive ratios, and warranty savings compliance."*

---

### 6. Secure CSV Report Exports

Endpoints mounted at `/api/v1/sustainability/export/:reportType`:
1. `expenditure`: Maintenance tasks, breakdown of labour/parts/other expenses, asset locations, and technician assignments.
2. `lifecycle`: Inventory summary with age, useful life remaining, purchase costs, maintenance costs, and burden ratios.
3. `compliance`: Preventive maintenance compliance rates and overdue backlogs across campus departments.
4. `repair-vs-replace`: Detailed review table for assets flagged with high maintenance burdens or expired lifespans.

#### Security & Privacy Protections:
*   **CSV Formula Injection Prevention (CWE-1236)**:
    All cells are sanitized through `sanitizeCsvCell()`. Any input starting with `=, +, -, @, \t, \r` is escaped by prefixing an apostrophe (`'`), preventing malicious spreadsheet command execution.
*   **Privacy & Identity Protection**:
    Student reporter personal information (names, emails, phone numbers, register numbers) is stripped from all exported records.
*   **Role-Based Access**:
    Export routes are strictly restricted to the `ADMIN` role.

---

### 7. API Endpoints Reference

Mounted at `/api/v1/sustainability`:

| Method | Endpoint | Authorization | Description |
|---|---|---|---|
| `GET` | `/overview` | `ADMIN`, `STAFF` | Overall sustainability and resource efficiency metrics. |
| `GET` | `/cost-analytics` | `ADMIN` | Filterable maintenance cost analytics and monthly trends. |
| `GET` | `/lifecycle-assessments` | `ADMIN` | Equipment flagged for repair vs replacement review. |
| `GET` | `/asset-lifecycle/:id` | `ADMIN`, `STAFF` | Single asset lifecycle summary and useful life calculation. |
| `GET` | `/export/:reportType` | `ADMIN` | Generates secure CSV reports with formula injection protection. |

---

### 8. Automated Test Suite Results

The automated test suite ([testSustainabilitySuite.ts](file:///c:/Users/lenovo/OneDrive/Desktop/Mini%20Project/server/src/utils/testSustainabilitySuite.ts)) executed on live MongoDB and Express instances:

```
========================================================================
 SMARTCAMPUS: PHASE 4 SUSTAINABILITY, COST & LIFECYCLE ENGINE
              COMPREHENSIVE 22-POINT AUTOMATED TEST SUITE
========================================================================

[Setup] Authenticating test personas and setting up test context...
✓ Personas and context ready.

[Test 1] Maintenance cost calculation and breakdown persistence...
✓ Test 1 Passed: Total cost 550 correctly calculated from Labour ($150) + Parts ($350) + Other ($50).

[Test 2] Negative cost rejection (API Validation)...
✓ Test 2 Passed: Negative cost rejected with 400 Bad Request: "Cost values must be non-negative monetary figures."

[Test 3] Backend total cost consistency on task completion...
✓ Test 3 Passed: Backend consistently computed total cost as $220 (tampered frontend total $9999 overridden).

[Test 4] Monthly expenditure aggregation across past 6 months...
✓ Test 4 Passed: 6 monthly intervals aggregated. Total historical trend expenditure = $9820.

[Test 5] Maintenance cost filtering by date range...
✓ Test 5 Passed: Date range filter [2026-09-18 to 2026-10-18] returned period expenditure: $7970.

[Test 6] Filtering expenditure by building and category...
✓ Test 6 Passed: Filter strictly isolated Science Block expenditure ($9820).

[Test 7] Preventive versus corrective cost breakdown verification...
✓ Test 7 Passed: Successfully partitioned: Preventive=$9270, Corrective=$550, Emergency=$0.

[Test 8] Exclusion of CANCELLED maintenance tasks from expenditure...
✓ Test 8 Passed: Cancelled tasks strictly excluded (Actual: $9820, expected: $9820).

[Test 9] Missing financial information handling...
✓ Test 9 Passed: Tasks with missing or unrecorded costs flagged separately (1 records), not treated as free maintenance.

[Test 10] Asset lifecycle summary calculation (Age, Costs, Ratios)...
✓ Test 10 Passed: Lifecycle summary exact: Age=3y, Remaining=7y, Cost=$2500, Ratio=25%.

[Test 11] Missing purchase and installation dates handling...
✓ Test 11 Passed: Missing dates gracefully handled with estimatedAgeYears=null and ageFormatted="Data unavailable".

[Test 12] Repair-versus-replacement assessment rules (High Burden & End of Life)...
✓ Test 12 Passed: Flagged under HIGH_MAINTENANCE_BURDEN (65% of purchase cost): "Conduct Replacement Feasibility Review: High Maintenance Burden (65% of Purchase Cost)".

[Test 13] Prevention of duplicate expenditure counting across runs...
✓ Test 13 Passed: Aggregations idempotent. Run 1: $14920 === Run 2: $14920.

[Test 14] Role-based access control (Students blocked from financial analytics)...
✓ Test 14 Passed: Student strictly blocked with 403 Forbidden; Admin granted access with 200 OK.

[Test 15] Staff restrictions on administrative financial endpoints...
✓ Test 15 Passed: Staff blocked from institutional financial analytics (403), permitted on resource efficiency overview (200).

[Test 16] CSV export correctness via HTTP API...
✓ Test 16 Passed: Expenditure CSV export returned 200 OK with valid headers and CSV schema.

[Test 17] CSV formula injection protection (CWE-1236 Sanitization)...
✓ Test 17 Passed: All 6 potential CSV formula injection vectors safely escaped with apostrophe prefix.

[Test 18] Reporter privacy preservation in CSV exports...
✓ Test 18 Passed: Zero student PII (email, register number) present in exported administrative reports.

[Test 19] Asset management regression test...
✓ Test 19 Passed: Core Asset list endpoint returned 13 campus assets.

[Test 20] Maintenance intelligence engine regression test...
✓ Test 20 Passed: Intelligence engine successfully evaluated 13 equipment items.

[Test 21] Complaint workflow regression test...
✓ Test 21 Passed: Complaints retrieval intact with 16 tickets.

[Test 22] Authentication & JWT verification regression test...
✓ Test 22 Passed: Authenticated session confirmed for Chief Admin (Campus Director) (admin@campus.edu).

========================================================================
                    TEST SUITE EXECUTION SUMMARY
                 TOTAL: 22  |  PASSED: 22  |  FAILED: 0
========================================================================

🎉 ALL 22 PHASE 4 SUSTAINABILITY & COST TESTS PASSED WITH ZERO REGRESSIONS!
```

#### Regression Test Results
*   Phase 3 Intelligence Suite (`testIntelligenceSuite.ts`): **17 / 17 Passed**
*   Phase 2 Asset & Maintenance Suite (`testAssetSuite.ts`): **14 / 14 Passed**
*   Phase 1 Authentication Suite (`testAuthSuite.ts`): **10 / 10 Passed**
*   Frontend Production Build (`tsc -b && vite build`): **0 Errors**

---

### 9. Known Limitations & Future Enhancements

1. **IoT Energy Sub-Metering**: Real-time kWh consumption and power factor telemetry currently require physical IoT hardware deployment. Once hardware is installed, energy timeseries records can be integrated into the sustainability module.
2. **Salvage Valuation**: In institutional settings, residual equipment scrap value or salvage credits can be subtracted from total replacement quotes. This field can be introduced once procurement establishes disposal price schedules.
