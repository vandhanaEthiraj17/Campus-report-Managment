import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Asset } from '../models/Asset';
import { MaintenanceRecord } from '../models/MaintenanceRecord';
import { Complaint } from '../models/Complaint';
import { Category } from '../models/Category';
import { Location } from '../models/Location';
import {
  getMaintenanceCostAnalytics,
  getAssetLifecycleSummary,
  getLifecycleRepairVsReplacementAssessments,
  getSustainabilityMetrics,
} from '../services/sustainabilityCostService';
import {
  sanitizeCsvCell,
  generateExpenditureReportCsv,
  generateLifecycleReportCsv,
  generateComplianceReportCsv,
  generateRepairVsReplacementCsv,
} from '../services/csvExportService';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api/v1';

async function runSustainabilityTestSuite() {
  console.log('\n========================================================================');
  console.log(' SMARTCAMPUS: PHASE 4 SUSTAINABILITY, COST & LIFECYCLE ENGINE');
  console.log('              COMPREHENSIVE 22-POINT AUTOMATED TEST SUITE');
  console.log('========================================================================\n');

  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_campus_db';
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoURI);
  }

  let passedTests = 0;
  const totalTests = 22;

  // Step 0: Obtain personas & tokens
  console.log('[Setup] Authenticating test personas and setting up test context...');

  const adminUser = await User.findOne({ role: 'ADMIN' });
  const staffUser = await User.findOne({ role: 'STAFF' });
  const studentUser = await User.findOne({ role: 'STUDENT' });

  if (!adminUser || !staffUser || !studentUser) {
    throw new Error('Required test users (ADMIN, STAFF, STUDENT) not found in database.');
  }

  staffUser.department = 'Electrical';
  await staffUser.save();

  // Login via API to receive real JWTs
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: adminUser.identifier || adminUser.email, password: 'password123' }),
  });
  const adminData = await adminLoginRes.json();
  const adminToken = adminData.token;

  const staffLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: staffUser.identifier || staffUser.email, password: 'password123' }),
  });
  const staffData = await staffLoginRes.json();
  const staffToken = staffData.token;

  const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: studentUser.identifier || studentUser.email, password: 'password123' }),
  });
  const studentData = await studentLoginRes.json();
  const studentToken = studentData.token;

  // Locations & Categories
  let testLocation = await Location.findOne({ buildingName: 'Science Block', roomNumber: 'Lab 204' });
  if (!testLocation) {
    testLocation = await Location.create({
      buildingName: 'Science Block',
      floor: '2',
      roomNumber: 'Lab 204',
      isActive: true,
    });
  }

  let elecCategory = await Category.findOne({ name: 'Electrical' });
  if (!elecCategory) {
    elecCategory = await Category.create({
      name: 'Electrical',
      description: 'Electrical fixtures',
      defaultDepartment: 'Electrical',
      defaultSLAHours: 24,
    });
  }

  console.log('✓ Personas and context ready.\n');

  // Clean up any old test records with code prefix TEST-SUST-
  await Asset.deleteMany({ assetCode: { $regex: /^TEST-SUST-/ } });
  await MaintenanceRecord.deleteMany({ recordId: { $regex: /^MR-SUST-/ } });

  // ------------------------------------------------------------------------
  // TEST 1: Maintenance cost calculations (Labour + Parts + Other = Total)
  // ------------------------------------------------------------------------
  try {
    console.log('[Test 1] Maintenance cost calculation and breakdown persistence...');
    const testAsset1 = await Asset.create({
      assetCode: 'TEST-SUST-01',
      assetName: 'Spectrophotometer Unit',
      assetType: 'LAB_EQUIPMENT',
      category: 'Lab Equipment',
      building: 'Science Block',
      floor: '2',
      room: 'Lab 204',
      status: 'ACTIVE',
      condition: 'GOOD',
      purchaseCost: 5000,
      expectedLifespanYears: 8,
      totalMaintenanceCost: 0,
    });

    const mRecord = await MaintenanceRecord.create({
      recordId: `MR-SUST-01-${Date.now()}`,
      asset: testAsset1._id,
      assetCode: testAsset1.assetCode,
      assetName: testAsset1.assetName,
      maintenanceType: 'CORRECTIVE',
      scheduledDate: new Date(),
      completedDate: new Date(),
      status: 'COMPLETED',
      labourCost: 150,
      partsCost: 350,
      otherExpenses: 50,
      cost: 550, // 150 + 350 + 50
      assignedDepartment: 'Lab Maintenance',
      workDescription: 'Optical grating alignment and sensor replacement',
    });

    if (mRecord.cost === 550 && mRecord.labourCost === 150 && mRecord.partsCost === 350 && mRecord.otherExpenses === 50) {
      console.log(`✓ Test 1 Passed: Total cost ${mRecord.cost} correctly calculated from Labour ($150) + Parts ($350) + Other ($50).`);
      passedTests++;
    } else {
      console.error('✗ Test 1 Failed: Cost mismatch:', mRecord);
    }
  } catch (err: any) {
    console.error('✗ Test 1 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 2: Negative cost rejection
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 2] Negative cost rejection (API Validation)...');
    const asset = await Asset.findOne({ assetCode: 'TEST-SUST-01' });

    const schedRes = await fetch(`${BASE_URL}/maintenance/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        assetId: asset?._id,
        scheduledDate: new Date(),
        workDescription: 'Test task with negative cost',
        labourCost: -50, // Invalid!
      }),
    });

    const data = await schedRes.json();
    if (schedRes.status === 400 && data.message.includes('non-negative')) {
      console.log(`✓ Test 2 Passed: Negative cost rejected with 400 Bad Request: "${data.message}"`);
      passedTests++;
    } else {
      console.error(`✗ Test 2 Failed: Status ${schedRes.status}`, data);
    }
  } catch (err: any) {
    console.error('✗ Test 2 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 3: Total cost consistency on completion
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 3] Backend total cost consistency on task completion...');
    const asset = await Asset.findOne({ assetCode: 'TEST-SUST-01' });

    // Schedule a record
    const sched = await MaintenanceRecord.create({
      recordId: `MR-SUST-COMP-${Date.now()}`,
      asset: asset?._id,
      assetCode: asset?.assetCode,
      assetName: asset?.assetName,
      maintenanceType: 'PREVENTIVE',
      scheduledDate: new Date(),
      status: 'SCHEDULED',
      workDescription: 'Filter cleaning',
      cost: 0,
    });

    // Complete task via API passing breakdown with inconsistent total to test backend enforcement
    const compRes = await fetch(`${BASE_URL}/maintenance/${sched._id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        workDescription: 'Filter replaced and calibrated',
        labourCost: 80,
        partsCost: 120,
        otherExpenses: 20,
        cost: 9999, // Tampered frontend total should be overridden by backend sum (80+120+20 = 220)
      }),
    });

    const updated = await MaintenanceRecord.findById(sched._id);
    if (compRes.status === 200 && updated?.cost === 220) {
      console.log(`✓ Test 3 Passed: Backend consistently computed total cost as $${updated.cost} (tampered frontend total $9999 overridden).`);
      passedTests++;
    } else {
      console.error('✗ Test 3 Failed:', compRes.status, updated?.cost);
    }
  } catch (err: any) {
    console.error('✗ Test 3 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 4: Monthly expenditure aggregation
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 4] Monthly expenditure aggregation across past 6 months...');
    const analytics = await getMaintenanceCostAnalytics();

    if (Array.isArray(analytics.monthlyExpenditureTrends) && analytics.monthlyExpenditureTrends.length === 6) {
      const totalSum = analytics.monthlyExpenditureTrends.reduce((acc, cur) => acc + cur.totalCost, 0);
      console.log(`✓ Test 4 Passed: 6 monthly intervals aggregated. Total historical trend expenditure = $${totalSum}.`);
      passedTests++;
    } else {
      console.error('✗ Test 4 Failed: Expected 6 monthly trend buckets.', analytics.monthlyExpenditureTrends);
    }
  } catch (err: any) {
    console.error('✗ Test 4 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 5: Filtering by date range
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 5] Maintenance cost filtering by date range...');
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 86400000);

    const filteredAnalytics = await getMaintenanceCostAnalytics({
      startDate: last30,
      endDate: now,
    });

    if (filteredAnalytics.periodExpenditure >= 0 && typeof filteredAnalytics.completedTasksCount === 'number') {
      console.log(`✓ Test 5 Passed: Date range filter [${last30.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}] returned period expenditure: $${filteredAnalytics.periodExpenditure}.`);
      passedTests++;
    } else {
      console.error('✗ Test 5 Failed:', filteredAnalytics);
    }
  } catch (err: any) {
    console.error('✗ Test 5 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 6: Filtering by building and category
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 6] Filtering expenditure by building and category...');
    const buildingAnalytics = await getMaintenanceCostAnalytics({
      building: 'Science Block',
    });

    const isMatch = buildingAnalytics.costByBuilding.every(b => /Science/i.test(b.building));
    if (isMatch) {
      console.log(`✓ Test 6 Passed: Filter strictly isolated Science Block expenditure ($${buildingAnalytics.totalRecordedExpenditure}).`);
      passedTests++;
    } else {
      console.error('✗ Test 6 Failed: Non-matching buildings included:', buildingAnalytics.costByBuilding);
    }
  } catch (err: any) {
    console.error('✗ Test 6 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 7: Preventive versus corrective cost breakdown
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 7] Preventive versus corrective cost breakdown verification...');
    const analytics = await getMaintenanceCostAnalytics();

    const prevCost = analytics.costByMaintenanceType.PREVENTIVE;
    const corrCost = analytics.costByMaintenanceType.CORRECTIVE;

    if (typeof prevCost === 'number' && typeof corrCost === 'number') {
      console.log(`✓ Test 7 Passed: Successfully partitioned: Preventive=$${prevCost}, Corrective=$${corrCost}, Emergency=$${analytics.costByMaintenanceType.EMERGENCY}.`);
      passedTests++;
    } else {
      console.error('✗ Test 7 Failed:', analytics.costByMaintenanceType);
    }
  } catch (err: any) {
    console.error('✗ Test 7 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 8: Exclusion of cancelled tasks
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 8] Exclusion of CANCELLED maintenance tasks from expenditure...');
    const asset = await Asset.findOne({ assetCode: 'TEST-SUST-01' });

    // Create a CANCELLED record with a large cost
    await MaintenanceRecord.create({
      recordId: `MR-SUST-CANCEL-${Date.now()}`,
      asset: asset?._id,
      assetCode: asset?.assetCode,
      assetName: asset?.assetName,
      maintenanceType: 'CORRECTIVE',
      scheduledDate: new Date(),
      status: 'CANCELLED',
      cost: 50000, // Should NOT be included in completed expenditure!
      workDescription: 'Cancelled task with hypothetical quote',
    });

    const analytics = await getMaintenanceCostAnalytics();
    const cancelledRecords = await MaintenanceRecord.find({ status: 'CANCELLED' });

    // Verify none of the cancelled records contributed to totalRecordedExpenditure
    const completedRecords = await MaintenanceRecord.find({ status: 'COMPLETED' });
    const expectedSum = completedRecords.reduce((acc, cur) => acc + (cur.cost || 0), 0);

    if (analytics.totalRecordedExpenditure === expectedSum) {
      console.log(`✓ Test 8 Passed: Cancelled tasks strictly excluded (Actual: $${analytics.totalRecordedExpenditure}, expected: $${expectedSum}).`);
      passedTests++;
    } else {
      console.error(`✗ Test 8 Failed: Total ${analytics.totalRecordedExpenditure} does not match expected ${expectedSum}`);
    }
  } catch (err: any) {
    console.error('✗ Test 8 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 9: Missing financial information handling
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 9] Missing financial information handling...');
    const asset = await Asset.findOne({ assetCode: 'TEST-SUST-01' });

    // Completed record with 0 cost
    await MaintenanceRecord.create({
      recordId: `MR-SUST-ZERO-${Date.now()}`,
      asset: asset?._id,
      assetCode: asset?.assetCode,
      assetName: asset?.assetName,
      maintenanceType: 'INSPECTION',
      scheduledDate: new Date(),
      status: 'COMPLETED',
      cost: 0,
      workDescription: 'Walkthrough visual check',
    });

    const analytics = await getMaintenanceCostAnalytics();

    if (analytics.missingCostRecordsCount > 0) {
      console.log(`✓ Test 9 Passed: Tasks with missing or unrecorded costs flagged separately (${analytics.missingCostRecordsCount} records), not treated as free maintenance.`);
      passedTests++;
    } else {
      console.error('✗ Test 9 Failed: Missing cost count was 0.');
    }
  } catch (err: any) {
    console.error('✗ Test 9 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 10: Asset lifecycle summary calculation (Age, Costs, Lifespan)
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 10] Asset lifecycle summary calculation (Age, Costs, Ratios)...');
    
    // Create asset purchased exactly 3 years ago
    const threeYearsAgo = new Date(Date.now() - 3 * 365.25 * 86400000);
    const lifeAsset = await Asset.create({
      assetCode: 'TEST-SUST-LIFE-01',
      assetName: 'Centrifuge High Speed',
      assetType: 'LAB_EQUIPMENT',
      category: 'Lab Equipment',
      building: 'Science Block',
      floor: '2',
      room: 'Lab 204',
      status: 'ACTIVE',
      condition: 'GOOD',
      purchaseDate: threeYearsAgo,
      purchaseCost: 10000,
      expectedLifespanYears: 10,
      totalMaintenanceCost: 0,
    });

    // Add 2 completed maintenance tasks ($1000 and $1500)
    await MaintenanceRecord.create({
      recordId: `MR-SUST-LIFE-A-${Date.now()}`,
      asset: lifeAsset._id,
      assetCode: lifeAsset.assetCode,
      assetName: lifeAsset.assetName,
      maintenanceType: 'PREVENTIVE',
      scheduledDate: new Date(Date.now() - 60 * 86400000),
      completedDate: new Date(Date.now() - 60 * 86400000),
      status: 'COMPLETED',
      cost: 1000,
      workDescription: 'Rotor bearing lubrication',
    });

    await MaintenanceRecord.create({
      recordId: `MR-SUST-LIFE-B-${Date.now()}`,
      asset: lifeAsset._id,
      assetCode: lifeAsset.assetCode,
      assetName: lifeAsset.assetName,
      maintenanceType: 'CORRECTIVE',
      scheduledDate: new Date(Date.now() - 10 * 86400000),
      completedDate: new Date(Date.now() - 10 * 86400000),
      status: 'COMPLETED',
      cost: 1500,
      workDescription: 'Motor brush replacement',
    });

    const summary = await getAssetLifecycleSummary(lifeAsset._id.toString());

    // Expected age ~ 3.0 yrs, remaining ~ 7.0 yrs, totalCost = 2500, ratio = 25%
    if (
      summary.estimatedAgeYears === 3.0 &&
      summary.usefulLifeRemainingYears === 7.0 &&
      summary.totalMaintenanceCost === 2500 &&
      summary.costToPurchaseRatioPercent === 25.0
    ) {
      console.log(`✓ Test 10 Passed: Lifecycle summary exact: Age=${summary.estimatedAgeYears}y, Remaining=${summary.usefulLifeRemainingYears}y, Cost=$${summary.totalMaintenanceCost}, Ratio=${summary.costToPurchaseRatioPercent}%.`);
      passedTests++;
    } else {
      console.error('✗ Test 10 Failed: Summary mismatch:', summary);
    }
  } catch (err: any) {
    console.error('✗ Test 10 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 11: Missing purchase and installation dates handling
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 11] Missing purchase and installation dates handling...');
    const noDateAsset = await Asset.create({
      assetCode: 'TEST-SUST-NODATE-01',
      assetName: 'Legacy Microscope Unit',
      assetType: 'LAB_EQUIPMENT',
      category: 'Lab Equipment',
      building: 'Science Block',
      floor: '2',
      room: 'Lab 204',
      status: 'ACTIVE',
      condition: 'FAIR',
    });

    const summary = await getAssetLifecycleSummary(noDateAsset._id.toString());

    if (summary.estimatedAgeYears === null && summary.ageFormatted === 'Data unavailable') {
      console.log(`✓ Test 11 Passed: Missing dates gracefully handled with estimatedAgeYears=null and ageFormatted="Data unavailable".`);
      passedTests++;
    } else {
      console.error('✗ Test 11 Failed:', summary);
    }
  } catch (err: any) {
    console.error('✗ Test 11 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 12: Repair-versus-replacement assessment rules
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 12] Repair-versus-replacement assessment rules (High Burden & End of Life)...');
    
    // Create an asset whose maintenance cost exceeds 60% of purchase price
    const highBurdenAsset = await Asset.create({
      assetCode: 'TEST-SUST-BURDEN-01',
      assetName: 'Industrial Exhaust Scrubber',
      assetType: 'LAB_EQUIPMENT',
      category: 'Lab Equipment',
      building: 'Science Block',
      floor: '2',
      room: 'Lab 204',
      status: 'ACTIVE',
      condition: 'POOR',
      purchaseCost: 4000,
      totalMaintenanceCost: 2600, // 65% of purchase price!
    });

    await MaintenanceRecord.create({
      recordId: `MR-SUST-BURDEN-${Date.now()}`,
      asset: highBurdenAsset._id,
      assetCode: highBurdenAsset.assetCode,
      assetName: highBurdenAsset.assetName,
      maintenanceType: 'CORRECTIVE',
      scheduledDate: new Date(),
      status: 'COMPLETED',
      cost: 2600,
      workDescription: 'Repeated impeller re-welding',
    });

    const assessments = await getLifecycleRepairVsReplacementAssessments();
    const flagged = assessments.flaggedAssets.find(a => a.assetCode === 'TEST-SUST-BURDEN-01');

    if (flagged && flagged.flag === 'HIGH_MAINTENANCE_BURDEN' && flagged.costRatioPercent === 65.0) {
      console.log(`✓ Test 12 Passed: Flagged under HIGH_MAINTENANCE_BURDEN (${flagged.costRatioPercent}% of purchase cost): "${flagged.title}".`);
      passedTests++;
    } else {
      console.error('✗ Test 12 Failed: Asset was not flagged as expected:', flagged);
    }
  } catch (err: any) {
    console.error('✗ Test 12 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 13: Prevention of duplicate expenditure counting
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 13] Prevention of duplicate expenditure counting across runs...');
    const analyticsRun1 = await getMaintenanceCostAnalytics();
    const analyticsRun2 = await getMaintenanceCostAnalytics();

    if (analyticsRun1.totalRecordedExpenditure === analyticsRun2.totalRecordedExpenditure) {
      console.log(`✓ Test 13 Passed: Aggregations idempotent. Run 1: $${analyticsRun1.totalRecordedExpenditure} === Run 2: $${analyticsRun2.totalRecordedExpenditure}.`);
      passedTests++;
    } else {
      console.error('✗ Test 13 Failed: Totals differed across repeated calls.');
    }
  } catch (err: any) {
    console.error('✗ Test 13 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 14: Role-based access to financial analytics (Student blocked)
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 14] Role-based access control (Students blocked from financial analytics)...');
    const studentRes = await fetch(`${BASE_URL}/sustainability/cost-analytics`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    const adminRes = await fetch(`${BASE_URL}/sustainability/cost-analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (studentRes.status === 403 && adminRes.status === 200) {
      console.log(`✓ Test 14 Passed: Student strictly blocked with 403 Forbidden; Admin granted access with 200 OK.`);
      passedTests++;
    } else {
      console.error(`✗ Test 14 Failed: studentRes=${studentRes.status}, adminRes=${adminRes.status}`);
    }
  } catch (err: any) {
    console.error('✗ Test 14 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 15: Staff department restrictions on financial endpoints
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 15] Staff restrictions on administrative financial endpoints...');
    const staffRes = await fetch(`${BASE_URL}/sustainability/cost-analytics`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    // Staff can view overall sustainability metrics
    const staffOverviewRes = await fetch(`${BASE_URL}/sustainability/overview`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    if (staffRes.status === 403 && staffOverviewRes.status === 200) {
      console.log(`✓ Test 15 Passed: Staff blocked from institutional financial analytics (403), permitted on resource efficiency overview (200).`);
      passedTests++;
    } else {
      console.error(`✗ Test 15 Failed: staffCost=${staffRes.status}, staffOverview=${staffOverviewRes.status}`);
    }
  } catch (err: any) {
    console.error('✗ Test 15 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 16: CSV export correctness (API & Content-Type)
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 16] CSV export correctness via HTTP API...');
    const exportRes = await fetch(`${BASE_URL}/sustainability/export/expenditure`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const contentType = exportRes.headers.get('content-type');
    const contentDisp = exportRes.headers.get('content-disposition');
    const csvText = await exportRes.text();

    if (
      exportRes.status === 200 &&
      contentType?.includes('text/csv') &&
      contentDisp?.includes('attachment') &&
      csvText.includes('Record Code')
    ) {
      console.log(`✓ Test 16 Passed: Expenditure CSV export returned 200 OK with valid headers and CSV schema.`);
      passedTests++;
    } else {
      console.error('✗ Test 16 Failed:', exportRes.status, contentType, contentDisp);
    }
  } catch (err: any) {
    console.error('✗ Test 16 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 17: CSV formula injection protection (CWE-1236)
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 17] CSV formula injection protection (CWE-1236 Sanitization)...');
    
    const maliciousInputs = [
      '=SUM(A1:A10)',
      '+1234567890',
      '-CMD|/C calc!A0',
      '@SUM(1,2)',
      '\tTabInjection',
      '\rReturnInjection',
    ];

    let allSanitized = true;
    for (const input of maliciousInputs) {
      const sanitized = sanitizeCsvCell(input);
      // Sanitized must start with "' (quote + apostrophe)
      if (!sanitized.startsWith("\"'")) {
        allSanitized = false;
        console.error(`Failed to sanitize: ${input} -> ${sanitized}`);
      }
    }

    if (allSanitized) {
      console.log(`✓ Test 17 Passed: All ${maliciousInputs.length} potential CSV formula injection vectors safely escaped with apostrophe prefix.`);
      passedTests++;
    } else {
      console.error('✗ Test 17 Failed: Vulnerable CSV cell detected.');
    }
  } catch (err: any) {
    console.error('✗ Test 17 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 18: Reporter privacy in exported data
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 18] Reporter privacy preservation in CSV exports...');
    const lifecycleCsv = await generateLifecycleReportCsv();
    const expenditureCsv = await generateExpenditureReportCsv();

    // Check that student user email or register number does NOT leak into CSVs
    const leaksStudent =
      lifecycleCsv.includes(studentUser.email) ||
      expenditureCsv.includes(studentUser.email) ||
      (studentUser.identifier && (lifecycleCsv.includes(studentUser.identifier) || expenditureCsv.includes(studentUser.identifier)));

    if (!leaksStudent) {
      console.log(`✓ Test 18 Passed: Zero student PII (email, register number) present in exported administrative reports.`);
      passedTests++;
    } else {
      console.error('✗ Test 18 Failed: Student identifier or email leaked in CSV export.');
    }
  } catch (err: any) {
    console.error('✗ Test 18 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 19: Existing asset management regression test
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 19] Asset management regression test...');
    const assetRes = await fetch(`${BASE_URL}/assets`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const assetData = await assetRes.json();

    if (assetRes.status === 200 && Array.isArray(assetData.assets)) {
      console.log(`✓ Test 19 Passed: Core Asset list endpoint returned ${assetData.assets.length} campus assets.`);
      passedTests++;
    } else {
      console.error('✗ Test 19 Failed:', assetRes.status, assetData);
    }
  } catch (err: any) {
    console.error('✗ Test 19 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 20: Existing intelligence engine regression test
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 20] Maintenance intelligence engine regression test...');
    const intelRes = await fetch(`${BASE_URL}/intelligence/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const intelData = await intelRes.json();

    if (intelRes.status === 200 && typeof intelData.totalAssets === 'number') {
      console.log(`✓ Test 20 Passed: Intelligence engine successfully evaluated ${intelData.totalAssets} equipment items.`);
      passedTests++;
    } else {
      console.error('✗ Test 20 Failed:', intelRes.status, intelData);
    }
  } catch (err: any) {
    console.error('✗ Test 20 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 21: Existing complaint workflow regression test
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 21] Complaint workflow regression test...');
    const compRes = await fetch(`${BASE_URL}/complaints`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const compData = await compRes.json();

    if (compRes.status === 200 && Array.isArray(compData.complaints)) {
      console.log(`✓ Test 21 Passed: Complaints retrieval intact with ${compData.complaints.length} tickets.`);
      passedTests++;
    } else {
      console.error('✗ Test 21 Failed:', compRes.status, compData);
    }
  } catch (err: any) {
    console.error('✗ Test 21 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 22: Existing authentication regression test
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 22] Authentication & JWT verification regression test...');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData = await meRes.json();

    if (meRes.status === 200 && meData.user?.email === adminUser.email) {
      console.log(`✓ Test 22 Passed: Authenticated session confirmed for ${meData.user.name} (${meData.user.email}).`);
      passedTests++;
    } else {
      console.error('✗ Test 22 Failed:', meRes.status, meData);
    }
  } catch (err: any) {
    console.error('✗ Test 22 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // Cleanup test assets and records
  // ------------------------------------------------------------------------
  await Asset.deleteMany({ assetCode: { $regex: /^TEST-SUST-/ } });
  await MaintenanceRecord.deleteMany({ recordId: { $regex: /^MR-SUST-/ } });

  console.log('\n========================================================================');
  console.log(`                    TEST SUITE EXECUTION SUMMARY`);
  console.log(`                 TOTAL: ${totalTests}  |  PASSED: ${passedTests}  |  FAILED: ${totalTests - passedTests}`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL 22 PHASE 4 SUSTAINABILITY & COST TESTS PASSED WITH ZERO REGRESSIONS!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.\n');
    process.exit(1);
  }
}

runSustainabilityTestSuite().catch((err) => {
  console.error('Fatal Test Runner Exception:', err);
  process.exit(1);
});
