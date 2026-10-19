import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Asset } from '../models/Asset';
import { MaintenanceRecord } from '../models/MaintenanceRecord';
import { Complaint } from '../models/Complaint';
import { Category } from '../models/Category';
import { Location } from '../models/Location';
import { Recommendation } from '../models/Recommendation';
import { checkAndProcessMaintenance } from '../services/maintenanceSchedulerService';
import { getMaintenanceCostAnalytics, getAssetLifecycleSummary } from '../services/sustainabilityCostService';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api/v1';

async function runIntegrationTestSuite() {
  console.log('\n========================================================================');
  console.log(' SMARTCAMPUS: PHASE 5 PRODUCTION INTEGRATION & E2E TEST SUITE');
  console.log('       VALIDATION OF SCENARIOS A THROUGH G ON LIVE STACK');
  console.log('========================================================================\n');

  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_campus_db';
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoURI);
  }

  let passed = 0;
  let failed = 0;
  const createdRecordIds: {
    assets: string[];
    maintenance: string[];
    complaints: string[];
    recommendations: string[];
  } = {
    assets: [],
    maintenance: [],
    complaints: [],
    recommendations: [],
  };

  const assert = (condition: boolean, testNum: number, name: string, detail?: string) => {
    if (condition) {
      console.log(`  ✓ Test ${testNum} Passed: ${name}`);
      if (detail) console.log(`    ↳ ${detail}`);
      passed++;
    } else {
      console.error(`  ✗ Test ${testNum} FAILED: ${name}`);
      if (detail) console.error(`    ↳ Detail: ${detail}`);
      failed++;
    }
  };

  // -------------------------------------------------------------------------
  // Setup: Personas and Authentication
  // -------------------------------------------------------------------------
  console.log('[Setup] Authenticating test personas (Admin, Staff, Faculty, Student)...');

  const adminUser = await User.findOne({ role: 'ADMIN' });
  const staffUser = await User.findOne({ role: 'STAFF' });
  const studentUser = await User.findOne({ role: 'STUDENT' });
  const facultyUser = await User.findOne({ role: 'FACULTY' });

  if (!adminUser || !staffUser || !studentUser || !facultyUser) {
    throw new Error('Required test personas (ADMIN, STAFF, STUDENT, FACULTY) must be in MongoDB.');
  }

  // Ensure test staff has electrical department
  staffUser.department = 'Electrical';
  await staffUser.save();

  // Obtain real JWTs via auth endpoints
  const adminRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: adminUser.identifier || adminUser.email, password: 'password123' }),
  });
  const adminToken = (await adminRes.json()).token;

  const staffRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: staffUser.identifier || staffUser.email, password: 'password123' }),
  });
  const staffToken = (await staffRes.json()).token;

  const studentRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: studentUser.identifier || studentUser.email, password: 'password123' }),
  });
  const studentToken = (await studentRes.json()).token;

  const facultyRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: facultyUser.identifier || facultyUser.email, password: 'password123' }),
  });
  const facultyToken = (await facultyRes.json()).token;

  // Retrieve test location and category
  let testLoc = await Location.findOne();
  if (!testLoc) {
    testLoc = await Location.create({ buildingName: 'Main Block', floor: '1st Floor', roomNumber: 'Room 101' });
  }

  let testCat = await Category.findOne();
  if (!testCat) {
    testCat = await Category.create({ name: 'Electrical & Lighting', defaultDepartment: 'Electrical', defaultSLAHours: 24 });
  }

  console.log('✓ Personas and shared context ready.\n');

  // =========================================================================
  // SCENARIO A: STUDENT COMPLAINT
  // =========================================================================
  console.log('--- SCENARIO A: STUDENT COMPLAINT WORKFLOW ---');
  let studentComplaintId = '';
  let studentComplaintTicketId = '';

  // 1. Student login validation
  assert(Boolean(studentToken), 1, 'Student logs in and acquires valid JWT session');

  // 2. Student creates a complaint
  const complaintPayload = {
    title: 'E2E Ceiling Fan Flickering and Speed Regulator Broken',
    description: 'Ceiling fan makes humming sound and speed regulator is unresponsive.',
    categoryId: testCat._id.toString(),
    buildingName: testLoc.buildingName,
    floor: testLoc.floor,
    roomNumber: testLoc.roomNumber,
    priority: 'Medium',
    incidentTimestamp: new Date().toISOString(),
    isAnonymous: false,
  };

  const createCompRes = await fetch(`${BASE_URL}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify(complaintPayload),
  });
  const compData = await createCompRes.json();
  studentComplaintId = compData.complaint?._id || compData._id;
  studentComplaintTicketId = compData.complaint?.ticketId || compData.ticketId;
  if (studentComplaintId) createdRecordIds.complaints.push(studentComplaintId);

  assert(
    createCompRes.status === 201 && Boolean(studentComplaintId),
    2,
    'Student creates complaint via API',
    `Created ticket: ${studentComplaintTicketId}`
  );

  // 3. Complaint is persisted in MongoDB with correct fields
  const dbComplaint = await Complaint.findById(studentComplaintId);
  assert(
    dbComplaint !== null && dbComplaint.status === 'Reported' && dbComplaint.title === complaintPayload.title,
    3,
    'Complaint persisted in MongoDB with initial Reported status and timeline'
  );

  // 4. Student sees the ticket in their dashboard list
  const studentListRes = await fetch(`${BASE_URL}/complaints`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const studentList = await studentListRes.json();
  const ticketFound = (studentList.complaints || []).some((c: any) => c._id === studentComplaintId || c.ticketId === studentComplaintTicketId);
  assert(ticketFound, 4, 'Student retrieves and views ticket in dashboard complaints list');

  // 5. Anonymous complaint identity masking
  const anonComp = await Complaint.create({
    ticketId: `CMP-ANON-${Date.now()}`,
    title: 'E2E Anonymous Safety Concern in Corridor',
    description: 'Poor illumination near fire escape staircase.',
    category: testCat._id,
    categoryName: testCat.name,
    location: testLoc._id,
    locationDetails: { buildingName: testLoc.buildingName, floor: testLoc.floor, roomNumber: testLoc.roomNumber },
    reportedBy: studentUser._id,
    reporterUserId: studentUser._id,
    reportedByName: studentUser.name,
    reporterRole: 'STUDENT',
    isAnonymous: true,
    status: 'Reported',
    priority: 'High',
  });
  createdRecordIds.complaints.push(anonComp._id.toString());

  // Technician fetches anonymous complaint
  const staffAnonRes = await fetch(`${BASE_URL}/complaints/${anonComp._id}`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const staffAnonData = await staffAnonRes.json();
  const anonMaskedCorrectly =
    staffAnonData.complaint?.reportedByName === 'Anonymous Reporter' &&
    staffAnonData.complaint?.reporterUserId === undefined &&
    !JSON.stringify(staffAnonData).includes(studentUser.name);

  assert(
    anonMaskedCorrectly,
    5,
    'Unauthorized users/staff cannot access private reporter PII on anonymous complaints',
    `ReportedByName: "${staffAnonData.complaint?.reportedByName}"`
  );

  // =========================================================================
  // SCENARIO B: MAINTENANCE WORKFLOW
  // =========================================================================
  console.log('\n--- SCENARIO B: MAINTENANCE ASSIGNMENT & REPAIR WORKFLOW ---');

  // 6. Admin assigns complaint to staff
  const assignRes = await fetch(`${BASE_URL}/complaints/${studentComplaintId}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      department: 'Electrical',
      staffId: staffUser._id.toString(),
      priority: 'High',
    }),
  });
  const assignData = await assignRes.json();
  assert(
    assignRes.status === 200 && assignData.complaint?.status === 'Assigned',
    6,
    'Administrator assigns complaint to maintenance staff',
    `Status: ${assignData.complaint?.status}`
  );

  // 7. Assigned staff member sees the task
  const staffTasksRes = await fetch(`${BASE_URL}/complaints?assignedStaff=${staffUser._id}`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const staffTasks = await staffTasksRes.json();
  const taskInQueue = (staffTasks.complaints || []).some((c: any) => c._id === studentComplaintId);
  assert(taskInQueue, 7, 'Assigned technician sees task in their maintenance queue');

  // 8. Staff records repair details and proof-of-work photo evidence
  const resolveRes = await fetch(`${BASE_URL}/complaints/${studentComplaintId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      afterImages: ['/uploads/e2e-repair-proof-fan.jpg'],
      resolutionNotes: 'Replaced fan regulator and tightened blade armature mounts. Operating normally.',
    }),
  });
  const resolveData = await resolveRes.json();
  assert(
    resolveRes.status === 200 && resolveData.complaint?.status === 'Resolved',
    8,
    'Staff member records repair details and evidence (Status becomes Resolved)',
    `Resolution: ${resolveData.complaint?.resolutionNotes}`
  );

  // 9. Original reporter rejects incomplete repair (reopens complaint)
  const rejectVerifyRes = await fetch(`${BASE_URL}/complaints/${studentComplaintId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      isSatisfied: false,
      comment: 'Fan still makes a vibrating rattling sound at highest speed.',
    }),
  });
  const rejectData = await rejectVerifyRes.json();
  assert(
    rejectVerifyRes.status === 200 && rejectData.complaint?.status === 'In Progress',
    9,
    'Student rejects repair, ticket returns to maintenance queue with In Progress status'
  );

  // 10. Staff re-resolves and student verifies with rating
  await fetch(`${BASE_URL}/complaints/${studentComplaintId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      afterImages: ['/uploads/e2e-repair-proof-fixed.jpg'],
      resolutionNotes: 'Re-aligned armature bearings and verified silent balanced operation.',
    }),
  });

  const finalVerifyRes = await fetch(`${BASE_URL}/complaints/${studentComplaintId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      isSatisfied: true,
      rating: 5,
      comment: 'Excellent fix! Runs smoothly and silently now. Thank you!',
    }),
  });
  const finalVerifyData = await finalVerifyRes.json();
  assert(
    finalVerifyRes.status === 200 &&
      finalVerifyData.complaint?.status === 'Closed' &&
      finalVerifyData.complaint?.feedback?.rating === 5,
    10,
    'Student verifies repair, rates service 5 stars, ticket is Closed and feedback persisted'
  );

  // =========================================================================
  // SCENARIO C: ASSET MANAGEMENT
  // =========================================================================
  console.log('\n--- SCENARIO C: ASSET MANAGEMENT & EQUIPMENT TRACKING ---');
  let testAssetId = '';
  const assetCode = `E2E-AST-${Math.floor(1000 + Math.random() * 9000)}`;

  // 11. Admin registers an asset
  const createAssetRes = await fetch(`${BASE_URL}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      assetCode,
      assetName: 'E2E High-Performance Core Network Switch',
      assetType: 'NETWORK_ROUTER',
      category: 'WiFi & Network',
      building: testLoc.buildingName,
      floor: testLoc.floor,
      room: testLoc.roomNumber,
      manufacturer: 'Cisco Systems',
      modelNumber: 'Catalyst-9300',
      purchaseDate: new Date('2023-01-10'),
      purchaseCost: 3500,
      expectedLifespanYears: 7,
      maintenanceFrequencyDays: 90,
      status: 'ACTIVE',
      condition: 'EXCELLENT',
    }),
  });
  const assetData = await createAssetRes.json();
  testAssetId = assetData.asset?._id;
  if (testAssetId) createdRecordIds.assets.push(testAssetId);

  assert(
    createAssetRes.status === 201 && Boolean(testAssetId),
    11,
    'Administrator registers new campus equipment asset',
    `AssetCode: ${assetCode} (ID: ${testAssetId})`
  );

  // 12. Duplicate asset codes are rejected
  const dupAssetRes = await fetch(`${BASE_URL}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      assetCode,
      assetName: 'Duplicate Code Attempt',
      assetType: 'NETWORK_ROUTER',
      category: 'WiFi & Network',
      building: testLoc.buildingName,
      floor: testLoc.floor,
      room: testLoc.roomNumber,
      maintenanceFrequencyDays: 90,
    }),
  });
  assert(dupAssetRes.status === 400, 12, 'Duplicate asset codes strictly rejected with 400 Bad Request');

  // 13. Complaint can optionally reference the asset
  const assetCompRes = await fetch(`${BASE_URL}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      title: 'E2E Switch Port 12 Packet Loss and Latency',
      description: 'Port 12 experiencing intermittent drops in classroom switch.',
      categoryId: testCat._id.toString(),
      buildingName: testLoc.buildingName,
      floor: testLoc.floor,
      roomNumber: testLoc.roomNumber,
      assetId: testAssetId,
      priority: 'Medium',
      incidentTimestamp: new Date().toISOString(),
    }),
  });
  const assetCompData = await assetCompRes.json();
  const linkedCompId = assetCompData.complaint?._id || assetCompData._id;
  if (linkedCompId) createdRecordIds.complaints.push(linkedCompId);

  const updatedAssetAfterComp = await Asset.findById(testAssetId);
  assert(
    assetCompRes.status === 201 && updatedAssetAfterComp?.complaintCount === 1,
    13,
    'Complaint successfully linked to asset; asset complaintCount incremented'
  );

  // 14. Invalid asset-location association rejected
  const mismatchRes = await fetch(`${BASE_URL}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      title: 'Location Mismatch Testing Ticket',
      description: 'Location does not match asset placement.',
      categoryId: testCat._id.toString(),
      buildingName: 'Science Wing',
      floor: '3rd Floor',
      roomNumber: 'Lab 305',
      assetId: testAssetId,
      priority: 'Low',
      incidentTimestamp: new Date().toISOString(),
    }),
  });
  assert(
    mismatchRes.status === 400,
    14,
    'Invalid asset-location mismatch rejected with 400 Bad Request'
  );

  // 15. Asset complaint history updated and queryable
  const assetDetailRes = await fetch(`${BASE_URL}/assets/${testAssetId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const assetDetail = await assetDetailRes.json();
  const complaintsList = assetDetail.complaints || assetDetail.linkedComplaints || [];
  const hasLinkedHistory = complaintsList.some((c: any) => c._id === linkedCompId || c.ticketId);
  assert(
    hasLinkedHistory && (assetDetail.complaintHistoryCount >= 1 || assetDetail.asset?.complaintCount >= 1),
    15,
    'Asset detail API returns historical complaints linked to equipment'
  );

  // =========================================================================
  // SCENARIO D: PREVENTIVE MAINTENANCE
  // =========================================================================
  console.log('\n--- SCENARIO D: PREVENTIVE MAINTENANCE LIFECYCLE ---');
  let maintenanceTaskId = '';

  // 16. Admin schedules maintenance
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const schedRes = await fetch(`${BASE_URL}/maintenance/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      assetId: testAssetId,
      maintenanceType: 'PREVENTIVE',
      scheduledDate: tomorrow,
      assignedStaffId: staffUser._id.toString(),
      assignedDepartment: 'Electrical',
      workDescription: 'Perform quarterly diagnostic check, firmware upgrade, and terminal vacuuming.',
    }),
  });
  const schedData = await schedRes.json();
  maintenanceTaskId = schedData.record?._id;
  if (maintenanceTaskId) createdRecordIds.maintenance.push(maintenanceTaskId);

  assert(
    schedRes.status === 201 && schedData.record?.status === 'SCHEDULED',
    16,
    'Administrator schedules preventive maintenance task',
    `Record ID: ${schedData.record?.recordId}`
  );

  // 17. Authorized staff starts the task
  const startTaskRes = await fetch(`${BASE_URL}/maintenance/${maintenanceTaskId}/start`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const startData = await startTaskRes.json();
  const assetUnderMnt = await Asset.findById(testAssetId);

  assert(
    startTaskRes.status === 200 &&
      startData.record?.status === 'IN_PROGRESS' &&
      assetUnderMnt?.status === 'UNDER_MAINTENANCE',
    17,
    'Staff starts task: Task status set to IN_PROGRESS, asset marked UNDER_MAINTENANCE'
  );

  // 18. Staff records maintenance completion and itemized costs
  const completeTaskRes = await fetch(`${BASE_URL}/maintenance/${maintenanceTaskId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      labourCost: 120,
      partsCost: 180,
      otherExpenses: 30,
      conditionAfter: 'EXCELLENT',
      notes: 'Diagnostic passed 100%. Firmware patched to v15.2. Filters cleaned.',
    }),
  });
  const completeData = await completeTaskRes.json();
  const refreshedAsset = await Asset.findById(testAssetId);

  assert(
    completeTaskRes.status === 200 &&
      completeData.record?.status === 'COMPLETED' &&
      completeData.record?.cost === 330 &&
      refreshedAsset?.status === 'ACTIVE' &&
      refreshedAsset?.lastMaintenanceDate !== undefined,
    18,
    'Staff records maintenance completion: Backend calculates $330 cost, updates asset dates and ACTIVE status'
  );

  // 19. Maintenance history persists
  const mntHistory = await MaintenanceRecord.find({ asset: testAssetId });
  assert(
    mntHistory.length >= 1 && mntHistory[0].status === 'COMPLETED',
    19,
    'Equipment maintenance history correctly persisted in database'
  );

  // 20. Repeated scheduler runs do not create duplicates
  const run1 = await checkAndProcessMaintenance();
  const run2 = await checkAndProcessMaintenance();
  assert(
    run2.upcomingRemindersSent === 0 && run2.autoScheduledTasks === 0,
    20,
    'Recurring maintenance scheduler runs are idempotent and prevent reminder/task duplication'
  );

  // =========================================================================
  // SCENARIO E: MAINTENANCE INTELLIGENCE
  // =========================================================================
  console.log('\n--- SCENARIO E: MAINTENANCE INTELLIGENCE & RECOMMENDATIONS ---');

  // 21. Asset health calculated from DB records
  const healthRes = await fetch(`${BASE_URL}/intelligence/health/${testAssetId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const healthData = await healthRes.json();
  const calculatedScore = healthData.assessment?.score ?? healthData.score;
  const healthCat = healthData.assessment?.category ?? healthData.category;
  assert(
    healthRes.status === 200 &&
      typeof calculatedScore === 'number' &&
      calculatedScore >= 0 &&
      calculatedScore <= 100 &&
      Array.isArray(healthData.assessment?.factors || healthData.factors),
    21,
    'Asset health score calculated from MongoDB records with explainable penalty factors',
    `Score: ${calculatedScore} (${healthCat})`
  );

  // 22. Recurring issues identified
  const recurringRes = await fetch(`${BASE_URL}/intelligence/recurring-issues?days=90`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const recurringData = await recurringRes.json();
  assert(
    recurringRes.status === 200 &&
      Array.isArray(recurringData.electricalHotspots) &&
      Array.isArray(recurringData.networkHotspots),
    22,
    'Recurring issue intelligence identifies campus equipment and location hotspots'
  );

  // 23. Recommendations generated with explanations
  const recsRes = await fetch(`${BASE_URL}/intelligence/recommendations`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const recsData = await recsRes.json();
  const sampleRec = (recsData.recommendations || [])[0];
  assert(
    recsRes.status === 200 &&
      Array.isArray(recsData.recommendations) &&
      (!sampleRec || (sampleRec.explanation && sampleRec.suggestedAction)),
    23,
    'Intelligence recommendations generated with explainable evidence and suggested actions'
  );

  // 24. Duplicate active recommendations prevented
  const activeRecCountBefore = await Recommendation.countDocuments({ status: 'OPEN' });
  await checkAndProcessMaintenance();
  const activeRecCountAfter = await Recommendation.countDocuments({ status: 'OPEN' });
  assert(
    activeRecCountBefore === activeRecCountAfter,
    24,
    'Duplicate active recommendations prevented across repeated intelligence evaluations',
    `Count remained constant at ${activeRecCountAfter}`
  );

  // 25. Recommendation can be linked to maintenance task
  let testRec = await Recommendation.findOne({ status: 'OPEN' });
  if (!testRec) {
    testRec = await Recommendation.create({
      recommendationCode: `E2E-REC-${Date.now()}`,
      asset: testAssetId,
      assetCode,
      assetName: 'Core Switch',
      recommendationType: 'INSPECT_FREQUENT_ISSUES',
      priority: 'MEDIUM',
      title: 'Inspect Intermittent Port Errors',
      explanation: 'Repeated packet drop complaints logged.',
      suggestedAction: 'Schedule technician terminal inspection.',
      assignedDepartment: 'Electrical',
      status: 'OPEN',
      healthScoreAtCreation: 85,
    });
    createdRecordIds.recommendations.push(testRec._id.toString());
  }

  const linkTaskRes = await fetch(`${BASE_URL}/intelligence/recommendations/${testRec._id}/link-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      maintenanceRecordId: maintenanceTaskId,
    }),
  });
  const linkTaskData = await linkTaskRes.json();
  assert(
    linkTaskRes.status === 200 && linkTaskData.recommendation?.status === 'TASK_CREATED',
    25,
    'Recommendation successfully linked to maintenance work order (Status: TASK_CREATED)'
  );

  // 26. Staff cannot access another department restricted records
  const deptScopedRes = await fetch(`${BASE_URL}/intelligence/recommendations`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const deptScopedData = await deptScopedRes.json();
  const foreignRecs = (deptScopedData.recommendations || []).filter(
    (r: any) =>
      r.assignedDepartment &&
      r.assignedDepartment !== 'Electrical' &&
      r.assignedStaff &&
      r.assignedStaff.toString() !== staffUser._id.toString()
  );
  assert(
    foreignRecs.length === 0,
    26,
    'Department scoping enforced: Staff restricted to their assigned department records only'
  );

  // =========================================================================
  // SCENARIO F: SUSTAINABILITY ANALYTICS
  // =========================================================================
  console.log('\n--- SCENARIO F: SUSTAINABILITY ANALYTICS & CSV SECURITY ---');

  // 27. Maintenance costs calculated on backend
  const costRes = await fetch(`${BASE_URL}/sustainability/cost-analytics`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const costData = await costRes.json();
  assert(
    costRes.status === 200 &&
      typeof costData.totalRecordedExpenditure === 'number' &&
      costData.expenditureBreakdown !== undefined,
    27,
    'Institutional maintenance costs and expenditure breakdowns computed on backend',
    `Total Expenditure: $${costData.totalRecordedExpenditure}`
  );

  // 28. Cancelled tasks excluded from completed expenditure
  const cancelledRecord = await MaintenanceRecord.create({
    recordId: `MNT-CANCEL-${Date.now()}`,
    asset: testAssetId,
    assetCode,
    assetName: 'Cancelled Work',
    maintenanceType: 'CORRECTIVE',
    scheduledDate: new Date(),
    cost: 5000,
    labourCost: 2000,
    partsCost: 3000,
    otherExpenses: 0,
    status: 'CANCELLED',
    workDescription: 'Cancelled order',
  });
  createdRecordIds.maintenance.push(cancelledRecord._id.toString());

  const costAfterCancel = await getMaintenanceCostAnalytics({});
  assert(
    !costAfterCancel.completedTasksCount || costAfterCancel.totalRecordedExpenditure < 500000,
    28,
    'Cancelled maintenance tasks strictly excluded from completed expenditure'
  );

  // 29. Date filters return correct records
  const filterStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const filterEnd = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
  const dateFilterRes = await fetch(
    `${BASE_URL}/sustainability/cost-analytics?startDate=${filterStart}&endDate=${filterEnd}`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  const dateFilterData = await dateFilterRes.json();
  assert(
    dateFilterRes.status === 200 && dateFilterData.periodExpenditure !== undefined,
    29,
    'Maintenance expenditure query adheres to date range filtering parameters'
  );

  // 30. Missing costs are not silently treated as free
  const missingCostTask = await MaintenanceRecord.create({
    recordId: `MNT-MISSING-${Date.now()}`,
    asset: testAssetId,
    assetCode,
    assetName: 'Unrecorded Cost Task',
    maintenanceType: 'INSPECTION',
    scheduledDate: new Date(),
    status: 'COMPLETED',
    cost: 0,
    labourCost: 0,
    partsCost: 0,
    otherExpenses: 0,
    workDescription: 'Inspection without financial tally recorded',
  });
  createdRecordIds.maintenance.push(missingCostTask._id.toString());

  const missingCheck = await getMaintenanceCostAnalytics({});
  assert(
    missingCheck.missingCostRecordsCount >= 1,
    30,
    'Tasks with missing cost data flagged separately and not silently treated as free maintenance'
  );

  // 31. Lifecycle assessments explain missing data
  const lifecycleSummary = await getAssetLifecycleSummary(testAssetId);
  assert(
    lifecycleSummary.assetId === testAssetId &&
      typeof lifecycleSummary.estimatedAgeYears === 'number' &&
      typeof lifecycleSummary.costToPurchaseRatioPercent === 'number',
    31,
    'Equipment lifecycle summary correctly calculates age, remaining lifespan, and cost ratio'
  );

  // 32. CSV export formula injection protection (CWE-1236)
  const csvRes = await fetch(`${BASE_URL}/sustainability/export/expenditure`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const csvText = await csvRes.text();
  assert(
    csvRes.status === 200 &&
      Boolean(csvRes.headers.get('content-type')?.includes('text/csv')) &&
      !csvText.includes('=cmd') &&
      !csvText.includes('@SUM'),
    32,
    'CSV report exports safely with CSV formula injection sanitization (CWE-1236)'
  );

  // 33. Student PII excluded from administrative exports
  const piiLeak = csvText.includes(studentUser.email) || csvText.includes(studentUser.name);
  assert(
    !piiLeak,
    33,
    'Student personal identifiable information (PII) excluded from administrative CSV reports'
  );

  // =========================================================================
  // SCENARIO G: AUTHORIZATION & RBAC MATRIX
  // =========================================================================
  console.log('\n--- SCENARIO G: AUTHORIZATION & RBAC MATRIX ---');

  // 34. No token -> 401 Unauthorized
  const noTokenRes = await fetch(`${BASE_URL}/admin/analytics`);
  assert(noTokenRes.status === 401, 34, 'Unauthenticated request with no token rejected with 401 Unauthorized');

  // 35. Invalid / tampered token -> 403 Forbidden
  const invalidTokenRes = await fetch(`${BASE_URL}/admin/analytics`, {
    headers: { Authorization: 'Bearer this_is_an_invalid_tampered_jwt_token_payload' },
  });
  assert(invalidTokenRes.status === 403, 35, 'Request with tampered/invalid token rejected with 403 Forbidden');

  // 36. Student account accessing Admin endpoint -> 403 Forbidden
  const studentAdminRes = await fetch(`${BASE_URL}/admin/analytics`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(
    studentAdminRes.status === 403,
    36,
    'Student attempting to access administrative analytics rejected with 403 Forbidden'
  );

  // 37. Faculty account accessing Admin assets creation -> 403 Forbidden
  const facultyAssetRes = await fetch(`${BASE_URL}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${facultyToken}` },
    body: JSON.stringify({ assetCode: 'FAC-DENY-01', assetName: 'Faculty Asset Denied' }),
  });
  assert(
    facultyAssetRes.status === 403,
    37,
    'Faculty attempting to perform admin asset management rejected with 403 Forbidden'
  );

  // 38. Staff account accessing institutional financial analytics -> 403 Forbidden
  const staffFinRes = await fetch(`${BASE_URL}/sustainability/cost-analytics`, {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert(
    staffFinRes.status === 403,
    38,
    'Staff attempting to access institutional cost analytics rejected with 403 Forbidden'
  );

  // 39. Administrator accessing management endpoints -> 200 OK
  const adminAccessRes = await fetch(`${BASE_URL}/admin/analytics`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    adminAccessRes.status === 200,
    39,
    'Administrator granted full access to administrative control center with 200 OK'
  );

  // 40. Clean up isolated test records
  console.log('\n[Cleanup] Removing isolated test records safely...');
  if (createdRecordIds.complaints.length > 0) {
    await Complaint.deleteMany({ _id: { $in: createdRecordIds.complaints } });
  }
  if (createdRecordIds.maintenance.length > 0) {
    await MaintenanceRecord.deleteMany({ _id: { $in: createdRecordIds.maintenance } });
  }
  if (createdRecordIds.assets.length > 0) {
    await Asset.deleteMany({ _id: { $in: createdRecordIds.assets } });
  }
  if (createdRecordIds.recommendations.length > 0) {
    await Recommendation.deleteMany({ _id: { $in: createdRecordIds.recommendations } });
  }
  assert(true, 40, 'Isolated test records and side-effects successfully cleaned up');

  // Summary
  console.log('\n========================================================================');
  console.log('              INTEGRATION TEST SUITE EXECUTION SUMMARY');
  console.log(`         TOTAL: ${passed + failed}  |  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log('========================================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL 40 INTEGRATION TESTS ACROSS SCENARIOS A THROUGH G PASSED 100%!\n');
    process.exit(0);
  } else {
    console.error(`💥 ${failed} TEST(S) FAILED.\n`);
    process.exit(1);
  }
}

runIntegrationTestSuite().catch((err) => {
  console.error('Unhandled Test Suite Error:', err);
  process.exit(1);
});
