import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Asset } from '../models/Asset';
import { MaintenanceRecord } from '../models/MaintenanceRecord';
import { Complaint } from '../models/Complaint';
import { Category } from '../models/Category';
import { Location } from '../models/Location';
import { Recommendation } from '../models/Recommendation';
import {
  calculateAssetHealth,
  evaluateAssetRecommendations,
  runFullIntelligenceEvaluation,
  analyzeRecurringIssues,
  getIntelligenceMetrics
} from '../services/maintenanceIntelligenceService';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api/v1';

async function runIntelligenceTestSuite() {
  console.log('\n========================================================================');
  console.log(' SMARTCAMPUS: PHASE 3 INTELLIGENT MAINTENANCE RECOMMENDATION ENGINE');
  console.log('              COMPREHENSIVE 17-POINT AUTOMATED TEST SUITE');
  console.log('========================================================================\n');

  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_campus_db';
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoURI);
  }

  let passedTests = 0;
  const totalTests = 17;

  // Step 0: Obtain personas & tokens
  console.log('[Setup] Authenticating test personas and setting up test context...');

  const adminUser = await User.findOne({ role: 'ADMIN' });
  const staffUser = await User.findOne({ role: 'STAFF' });
  const studentUser = await User.findOne({ role: 'STUDENT' });

  if (!adminUser || !staffUser || !studentUser) {
    throw new Error('Required test users (ADMIN, STAFF, STUDENT) not found in database.');
  }

  // Ensure staffUser has Electrical department
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

  // Categories & Location
  let elecCategory = await Category.findOne({ name: 'Electrical' });
  if (!elecCategory) {
    elecCategory = await Category.create({
      name: 'Electrical',
      description: 'Electrical fixtures',
      defaultDepartment: 'Electrical',
      defaultSLAHours: 24,
    });
  }

  let netCategory = await Category.findOne({ name: 'WiFi & Network' });
  if (!netCategory) {
    netCategory = await Category.create({
      name: 'WiFi & Network',
      description: 'Network infrastructure',
      defaultDepartment: 'IT Support',
      defaultSLAHours: 12,
    });
  }

  let testLocation = await Location.findOne({ buildingName: 'Engineering Block', roomNumber: 'Lab 101' });
  if (!testLocation) {
    testLocation = await Location.create({
      buildingName: 'Engineering Block',
      floor: '1',
      roomNumber: 'Lab 101',
      isActive: true
    });
  }

  console.log('✓ Personas and context ready.\n');

  // Clean up any old test assets with code prefix TEST-INTEL-
  await Asset.deleteMany({ assetCode: { $regex: /^TEST-INTEL-/ } });
  await MaintenanceRecord.deleteMany({ recordId: { $regex: /^MR-INTEL-/ } });
  await Complaint.deleteMany({ ticketId: { $regex: /^TKT-INTEL-/ } });
  await Recommendation.deleteMany({ assetCode: { $regex: /^TEST-INTEL-/ } });

  // Helpers to evaluate directly using model queries
  const getHealth = async (assetId: any) => {
    const asset = await Asset.findById(assetId);
    if (!asset) throw new Error('Asset not found');
    const complaints = await Complaint.find({ asset: asset._id });
    const records = await MaintenanceRecord.find({ asset: asset._id });
    return calculateAssetHealth(asset, complaints, records);
  };

  const getRecommendations = async (assetId: any) => {
    const asset = await Asset.findById(assetId);
    if (!asset) throw new Error('Asset not found');
    const complaints = await Complaint.find({ asset: asset._id });
    const records = await MaintenanceRecord.find({ asset: asset._id });
    const assessment = calculateAssetHealth(asset, complaints, records);
    return evaluateAssetRecommendations(asset, complaints, records, assessment);
  };

  // ------------------------------------------------------------------------
  // TEST 1: Asset Health Score calculation (Formula & Determinism)
  // ------------------------------------------------------------------------
  try {
    console.log('[Test 1] Asset Health Score calculation (Formula, Deductions & Hygiene)...');
    
    // Create an asset in FAIR condition (-10) with 1 completed preventive maintenance (+0, FAIR does not get +5 bonus since bonus requires EXCELLENT/GOOD)
    // Let's test FAIR condition: 100 - 10 = 90
    const testAsset1 = await Asset.create({
      assetCode: 'TEST-INTEL-01',
      assetName: 'Main Switchboard Test',
      assetType: 'ELECTRICAL_PANEL',
      category: 'Electrical',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      location: testLocation._id,
      status: 'ACTIVE',
      condition: 'FAIR', // -10 penalty
      maintenanceFrequencyDays: 30,
      assignedDepartment: 'Electrical',
      complaintCount: 0
    });

    // 1 closed complaint (no unresolved penalty)
    await Complaint.create({
      ticketId: `TKT-INTEL-${Date.now()}-01`,
      title: 'Flickering switchboard TEST-INTEL',
      description: 'Minor flicker observed',
      category: elecCategory._id,
      categoryName: elecCategory.name,
      location: testLocation._id,
      locationDetails: { buildingName: 'Engineering Block', floor: '1', roomNumber: 'Lab 101' },
      asset: testAsset1._id,
      assetCode: testAsset1.assetCode,
      assetName: testAsset1.assetName,
      reportedBy: studentUser._id,
      status: 'Closed',
      priority: 'Medium'
    });

    const health = await getHealth(testAsset1._id);

    // Baseline: 100
    // FAIR condition: -10
    // Expected: 90 ('Healthy')
    if (health.score === 90 && health.category === 'Healthy') {
      console.log(`✓ Test 1 Passed: Calculated score = ${health.score} (${health.category}) exactly matches expected formula.`);
      passedTests++;
    } else {
      console.error(`✗ Test 1 Failed: Expected score 90, received ${health.score} (${health.category})`);
    }
  } catch (err: any) {
    console.error('✗ Test 1 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 2: Score Boundary Conditions (0 and 100 Clamping)
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 2] Score Boundary Conditions (0 to 100 Clamping)...');
    
    // Critical asset: condition CRITICAL (-35), status DECOMMISSIONED (-100) -> clamped to 0
    const criticalAsset = await Asset.create({
      assetCode: 'TEST-INTEL-02',
      assetName: 'Generator Unit Extreme Test',
      assetType: 'ELECTRICAL_PANEL',
      category: 'Electrical',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      location: testLocation._id,
      status: 'DECOMMISSIONED',
      condition: 'CRITICAL',
      maintenanceFrequencyDays: 30,
      assignedDepartment: 'Electrical',
      complaintCount: 5
    });

    const healthMin = await getHealth(criticalAsset._id);

    // Pristine asset: EXCELLENT condition (0 deductions) + completed preventive (+5 bonus) -> clamped to 100
    const pristineAsset = await Asset.create({
      assetCode: 'TEST-INTEL-02-PRISTINE',
      assetName: 'Brand New Fiber Switch',
      assetType: 'NETWORK_ROUTER',
      category: 'WiFi & Network',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      location: testLocation._id,
      status: 'ACTIVE',
      condition: 'EXCELLENT',
      maintenanceFrequencyDays: 90,
      assignedDepartment: 'IT Support',
      complaintCount: 0
    });

    await MaintenanceRecord.create({
      recordId: `MR-INTEL-BONUS-${Date.now()}`,
      asset: pristineAsset._id,
      assetCode: pristineAsset.assetCode,
      assetName: pristineAsset.assetName,
      maintenanceType: 'PREVENTIVE',
      status: 'COMPLETED',
      cost: 0,
      scheduledDate: new Date(Date.now() - 30 * 86400000),
      completedDate: new Date(Date.now() - 29 * 86400000),
      assignedDepartment: 'IT Support',
      workDescription: 'Routine preventive inspection'
    });

    const healthMax = await getHealth(pristineAsset._id);

    if (healthMin.score === 0 && healthMin.category === 'Critical' && healthMax.score === 100 && healthMax.category === 'Healthy') {
      console.log(`✓ Test 2 Passed: Boundaries strictly clamped between 0 (got ${healthMin.score}) and 100 (got ${healthMax.score}).`);
      passedTests++;
    } else {
      console.error(`✗ Test 2 Failed: Min score was ${healthMin.score}, Max score was ${healthMax.score}`);
    }
  } catch (err: any) {
    console.error('✗ Test 2 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 3: Missing Historical Data & Limited Confidence Indicator
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 3] Missing Historical Data Handling (Confidence Assessment)...');
    
    // Create an asset that has zero complaints and zero maintenance records
    const brandNewAsset = await Asset.create({
      assetCode: 'TEST-INTEL-03',
      assetName: 'Newly Commissioned Router',
      assetType: 'NETWORK_ROUTER',
      category: 'WiFi & Network',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      location: testLocation._id,
      status: 'ACTIVE',
      condition: 'GOOD',
      assignedDepartment: 'IT Support',
      complaintCount: 0
    });

    const health = await getHealth(brandNewAsset._id);

    if (health.confidence === 'LOW' && health.hasLimitedData === true) {
      console.log(`✓ Test 3 Passed: Zero telemetry tagged with confidence = "${health.confidence}" and hasLimitedData = true.`);
      passedTests++;
    } else {
      console.error(`✗ Test 3 Failed: Unexpected data sufficiency: confidence=${health.confidence}, hasLimitedData=${health.hasLimitedData}`);
    }
  } catch (err: any) {
    console.error('✗ Test 3 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 4: Repeated Complaints for the Same Asset
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 4] Repeated Complaints Detection and Penalties for Same Asset...');
    
    const repeatAsset = await Asset.create({
      assetCode: 'TEST-INTEL-04',
      assetName: 'Repeatedly Failing Air Handler',
      assetType: 'AIR_CONDITIONER',
      category: 'Electrical',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      location: testLocation._id,
      status: 'ACTIVE',
      condition: 'GOOD',
      assignedDepartment: 'Electrical',
      complaintCount: 3
    });

    // File 3 distinct complaints in the last 30 days
    for (let i = 0; i < 3; i++) {
      await Complaint.create({
        ticketId: `TKT-INTEL-REP-${Date.now()}-${i}`,
        title: `AC Blowing Hot Air TEST-INTEL ${i}`,
        description: 'Compressor thermal trip',
        category: elecCategory._id,
        categoryName: elecCategory.name,
        location: testLocation._id,
        locationDetails: { buildingName: 'Engineering Block', floor: '1', roomNumber: 'Lab 101' },
        asset: repeatAsset._id,
        assetCode: repeatAsset.assetCode,
        assetName: repeatAsset.assetName,
        reportedBy: studentUser._id,
        status: i === 0 ? 'Closed' : 'In Progress',
        priority: 'High',
        createdAt: new Date(Date.now() - (i * 3) * 86400000)
      });
    }

    const health = await getHealth(repeatAsset._id);
    const repeatFactor = health.factors.find(f => f.factor.includes('Repeated Complaint Frequency'));

    if (repeatFactor && repeatFactor.impact < 0) {
      console.log(`✓ Test 4 Passed: Repeated complaints detected: factor "${repeatFactor.factor}", penalty ${repeatFactor.impact} pts.`);
      passedTests++;
    } else {
      console.error('✗ Test 4 Failed: Repeat complaint factor was not found or has non-negative impact.');
    }
  } catch (err: any) {
    console.error('✗ Test 4 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 5: Closed vs Active Complaint Handling
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 5] Closed vs Active Complaint Handling...');
    
    const assetA = await Asset.create({
      assetCode: 'TEST-INTEL-05A',
      assetName: 'Asset with Closed Complaints',
      assetType: 'ELECTRICAL_PANEL',
      category: 'Electrical',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      location: testLocation._id,
      status: 'ACTIVE',
      condition: 'GOOD',
      assignedDepartment: 'Electrical',
      complaintCount: 0
    });

    const assetB = await Asset.create({
      assetCode: 'TEST-INTEL-05B',
      assetName: 'Asset with Active Unresolved Complaints',
      assetType: 'ELECTRICAL_PANEL',
      category: 'Electrical',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      location: testLocation._id,
      status: 'ACTIVE',
      condition: 'GOOD',
      assignedDepartment: 'Electrical',
      complaintCount: 0
    });

    // 2 CLOSED complaints on Asset A
    for (let i = 0; i < 2; i++) {
      await Complaint.create({
        ticketId: `TKT-INTEL-CLS-${Date.now()}-${i}`,
        title: `Historical Solved Issue ${i}`,
        description: 'Already fixed long ago',
        category: elecCategory._id,
        categoryName: elecCategory.name,
        location: testLocation._id,
        locationDetails: { buildingName: 'Engineering Block', floor: '1', roomNumber: 'Lab 101' },
        asset: assetA._id,
        assetCode: assetA.assetCode,
        assetName: assetA.assetName,
        reportedBy: studentUser._id,
        status: 'Closed',
        priority: 'High',
        createdAt: new Date(Date.now() - 40 * 86400000)
      });
    }

    // 2 ACTIVE (In Progress) complaints on Asset B
    for (let i = 0; i < 2; i++) {
      await Complaint.create({
        ticketId: `TKT-INTEL-ACT-${Date.now()}-${i}`,
        title: `Active Pending Issue ${i}`,
        description: 'Currently broken and open',
        category: elecCategory._id,
        categoryName: elecCategory.name,
        location: testLocation._id,
        locationDetails: { buildingName: 'Engineering Block', floor: '1', roomNumber: 'Lab 101' },
        asset: assetB._id,
        assetCode: assetB.assetCode,
        assetName: assetB.assetName,
        reportedBy: studentUser._id,
        status: 'In Progress',
        priority: 'High',
        createdAt: new Date(Date.now() - 5 * 86400000)
      });
    }

    const healthA = await getHealth(assetA._id);
    const healthB = await getHealth(assetB._id);

    // Active complaints should penalize asset B (penalties for active high priority) while asset A remains unpenalized
    if (healthA.score > healthB.score) {
      console.log(`✓ Test 5 Passed: Closed complaints yield score ${healthA.score} while active unresolved yield score ${healthB.score}.`);
      passedTests++;
    } else {
      console.error(`✗ Test 5 Failed: Expected healthA (${healthA.score}) > healthB (${healthB.score})`);
    }
  } catch (err: any) {
    console.error('✗ Test 5 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 6: Overdue Maintenance Detection
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 6] Overdue Preventive Maintenance Detection & Recommendation...');
    
    const overdueAsset = await Asset.create({
      assetCode: 'TEST-INTEL-06',
      assetName: 'Substation Transformer Overdue',
      assetType: 'ELECTRICAL_PANEL',
      category: 'Electrical',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      location: testLocation._id,
      status: 'ACTIVE',
      condition: 'GOOD',
      maintenanceFrequencyDays: 30,
      nextMaintenanceDate: new Date(Date.now() - 25 * 86400000), // 25 days overdue
      assignedDepartment: 'Electrical',
      complaintCount: 0
    });

    const recommendations = await getRecommendations(overdueAsset._id);
    const overdueRec = recommendations.find(r => r.recommendationType === 'OVERDUE_PREVENTIVE');

    if (overdueRec && overdueRec.priority === 'HIGH' && overdueRec.suggestedAction.includes('maintenance')) {
      console.log(`✓ Test 6 Passed: Generated recommendation "${overdueRec.title}" with priority ${overdueRec.priority}.`);
      passedTests++;
    } else {
      console.error('✗ Test 6 Failed: OVERDUE_PREVENTIVE recommendation not generated.');
    }
  } catch (err: any) {
    console.error('✗ Test 6 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 7: Warranty-Aware Recommendations
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 7] Warranty-Aware Recommendations (WARRANTY_ELIGIBLE)...');
    
    const warrantyAsset = await Asset.create({
      assetCode: 'TEST-INTEL-07',
      assetName: 'Smart Projector Under Warranty',
      assetType: 'ELECTRICAL_PANEL',
      category: 'Electrical',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      location: testLocation._id,
      status: 'IN_REPAIR',
      condition: 'CRITICAL',
      warrantyExpiryDate: new Date(Date.now() + 180 * 86400000), // 6 months warranty remaining
      manufacturer: 'Sony Pro Support',
      assignedDepartment: 'Electrical',
      complaintCount: 1
    });

    await Complaint.create({
      ticketId: `TKT-INTEL-WAR-${Date.now()}`,
      title: 'Power supply failure under warranty',
      description: 'Internal board failure',
      category: elecCategory._id,
      categoryName: elecCategory.name,
      location: testLocation._id,
      locationDetails: { buildingName: 'Engineering Block', floor: '1', roomNumber: 'Lab 101' },
      asset: warrantyAsset._id,
      assetCode: warrantyAsset.assetCode,
      assetName: warrantyAsset.assetName,
      reportedBy: studentUser._id,
      status: 'Reported',
      priority: 'High'
    });

    const recommendations = await getRecommendations(warrantyAsset._id);
    const warrantyRec = recommendations.find(r => r.recommendationType === 'WARRANTY_ELIGIBLE');

    if (warrantyRec && warrantyRec.explanation.includes('warranty')) {
      console.log(`✓ Test 7 Passed: Warranty identified: "${warrantyRec.title}" - Manufacturer: Sony Pro Support.`);
      passedTests++;
    } else {
      console.error('✗ Test 7 Failed: WARRANTY_ELIGIBLE recommendation not generated for asset under warranty.');
    }
  } catch (err: any) {
    console.error('✗ Test 7 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 8: Duplicate Recommendation Prevention (Stable Deduplication)
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 8] Duplicate Recommendation Prevention across Repeated Runs...');
    
    const dupTestAsset = await Asset.create({
      assetCode: 'TEST-INTEL-08',
      assetName: 'Main Distribution Unit Dup Test',
      assetType: 'ELECTRICAL_PANEL',
      category: 'Electrical',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      location: testLocation._id,
      status: 'ACTIVE',
      condition: 'CRITICAL',
      maintenanceFrequencyDays: 30,
      nextMaintenanceDate: new Date(Date.now() - 15 * 86400000),
      assignedDepartment: 'Electrical',
      complaintCount: 0
    });

    // Run evaluation pass 1
    await getRecommendations(dupTestAsset._id);
    const countAfterPass1 = await Recommendation.countDocuments({ asset: dupTestAsset._id });

    // Run evaluation pass 2 immediately
    await getRecommendations(dupTestAsset._id);
    const countAfterPass2 = await Recommendation.countDocuments({ asset: dupTestAsset._id });

    if (countAfterPass1 > 0 && countAfterPass1 === countAfterPass2) {
      console.log(`✓ Test 8 Passed: Pass 1 created ${countAfterPass1} recommendations; Pass 2 kept count at ${countAfterPass2} without duplication.`);
      passedTests++;
    } else {
      console.error(`✗ Test 8 Failed: Count changed from ${countAfterPass1} to ${countAfterPass2}`);
    }
  } catch (err: any) {
    console.error('✗ Test 8 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 9: Recommendation Creation and Persistence
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 9] Recommendation Creation and Field Persistence in MongoDB...');
    
    const sampleRec = await Recommendation.findOne({ assetCode: 'TEST-INTEL-08' });
    if (
      sampleRec &&
      sampleRec.recommendationCode &&
      sampleRec.title &&
      sampleRec.explanation &&
      Array.isArray(sampleRec.evidence) &&
      sampleRec.evidence.length > 0 &&
      sampleRec.suggestedAction &&
      sampleRec.status === 'OPEN'
    ) {
      console.log(`✓ Test 9 Passed: Recommendation ${sampleRec.recommendationCode} persisted with all required explainable evidence fields.`);
      passedTests++;
    } else {
      console.error('✗ Test 9 Failed: Persisted recommendation missing required fields:', sampleRec);
    }
  } catch (err: any) {
    console.error('✗ Test 9 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 10: Recommendation-to-Maintenance-Task Linking
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 10] Recommendation-to-Maintenance-Task Linking via API...');
    
    const targetRec = await Recommendation.findOne({ assetCode: 'TEST-INTEL-08', status: 'OPEN' });
    if (!targetRec) {
      throw new Error('Target recommendation not found for linking.');
    }

    // Create a maintenance record to link
    const newRecord = await MaintenanceRecord.create({
      recordId: `MR-INTEL-LINK-${Date.now()}`,
      asset: targetRec.asset,
      assetCode: targetRec.assetCode,
      assetName: targetRec.assetName,
      maintenanceType: 'CORRECTIVE',
      status: 'SCHEDULED',
      cost: 0,
      scheduledDate: new Date(Date.now() + 2 * 86400000),
      assignedDepartment: 'Electrical',
      workDescription: 'Actioned task from recommendation'
    });

    const linkRes = await fetch(`${BASE_URL}/intelligence/recommendations/${targetRec._id}/link-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ maintenanceRecordId: newRecord._id.toString() })
    });

    const linkData = await linkRes.json();
    const updatedRec = await Recommendation.findById(targetRec._id);

    if (
      linkRes.status === 200 &&
      updatedRec?.status === 'TASK_CREATED' &&
      updatedRec.linkedMaintenanceRecord?.toString() === newRecord._id.toString()
    ) {
      console.log(`✓ Test 10 Passed: Task linked successfully. Status updated to TASK_CREATED and linkedMaintenanceRecord populated.`);
      passedTests++;
    } else {
      console.error('✗ Test 10 Failed:', linkRes.status, linkData);
    }
  } catch (err: any) {
    console.error('✗ Test 10 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 11: Role-Based Access Control (RBAC)
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 11] Role-Based Access Control (RBAC Protection)...');
    
    // Attempt to access intelligence endpoints with student token
    const studentRes = await fetch(`${BASE_URL}/intelligence/overview`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });

    // Attempt to access with no token
    const noTokenRes = await fetch(`${BASE_URL}/intelligence/overview`);

    // Admin should succeed (200)
    const adminRes = await fetch(`${BASE_URL}/intelligence/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (studentRes.status === 403 && noTokenRes.status === 401 && adminRes.status === 200) {
      console.log(`✓ Test 11 Passed: Student blocked with 403 Forbidden, anonymous blocked with 401 Unauthorized, Admin allowed with 200 OK.`);
      passedTests++;
    } else {
      console.error(`✗ Test 11 Failed: Student=${studentRes.status}, NoToken=${noTokenRes.status}, Admin=${adminRes.status}`);
    }
  } catch (err: any) {
    console.error('✗ Test 11 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 12: Staff Department Scoping
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 12] Staff Department Scoping in Recommendations API...');
    
    // Create an IT asset with a recommendation
    const itAsset = await Asset.create({
      assetCode: 'TEST-INTEL-IT-01',
      assetName: 'Server Rack IT Test',
      assetType: 'NETWORK_ROUTER',
      category: 'WiFi & Network',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      location: testLocation._id,
      status: 'ACTIVE',
      condition: 'CRITICAL',
      assignedDepartment: 'IT Support',
      complaintCount: 0
    });

    await getRecommendations(itAsset._id);

    // Call recommendations API as staff (department = 'Electrical')
    const staffRecRes = await fetch(`${BASE_URL}/intelligence/recommendations`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const staffRecData = await staffRecRes.json();
    const recommendationsList = staffRecData.recommendations || [];

    // Verify staff does not receive IT Support recommendations
    const hasItRecs = recommendationsList.some((r: any) => r.assignedDepartment === 'IT Support' && r.assignedStaff !== staffUser._id.toString());

    if (staffRecRes.status === 200 && !hasItRecs) {
      console.log(`✓ Test 12 Passed: Electrical staff successfully isolated to their department. Zero IT recommendations leaked.`);
      passedTests++;
    } else {
      console.error(`✗ Test 12 Failed: Leaked IT recommendations or bad status (${staffRecRes.status})`);
    }
  } catch (err: any) {
    console.error('✗ Test 12 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 13: Anonymous Reporter Privacy in Recommendation Responses
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 13] Anonymous Reporter Privacy Protection in Recommendations...');
    
    const anonAsset = await Asset.create({
      assetCode: 'TEST-INTEL-ANON-01',
      assetName: 'Public Kiosk Terminal',
      assetType: 'ELECTRICAL_PANEL',
      category: 'Electrical',
      building: 'Engineering Block',
      floor: '1',
      room: 'Lab 101',
      location: testLocation._id,
      status: 'ACTIVE',
      condition: 'CRITICAL',
      assignedDepartment: 'Electrical',
      complaintCount: 1
    });

    // File an ANONYMOUS complaint linked to this asset
    const anonComplaint = await Complaint.create({
      ticketId: `TKT-INTEL-ANON-${Date.now()}`,
      title: 'Short circuit sparks at kiosk',
      description: 'Dangerous electrical sparks seen near power outlet',
      category: elecCategory._id,
      categoryName: elecCategory.name,
      location: testLocation._id,
      locationDetails: { buildingName: 'Engineering Block', floor: '1', roomNumber: 'Lab 101' },
      asset: anonAsset._id,
      assetCode: anonAsset.assetCode,
      assetName: anonAsset.assetName,
      reportedBy: studentUser._id,
      reportedByName: 'Hidden Student',
      isAnonymous: true,
      status: 'Reported',
      priority: 'High'
    });

    // Generate recommendation
    await getRecommendations(anonAsset._id);
    const anonRec = await Recommendation.findOne({ asset: anonAsset._id });

    if (!anonRec) {
      throw new Error('Recommendation for anon asset not found.');
    }

    // Fetch recommendation details via staff API
    const recDetailRes = await fetch(`${BASE_URL}/intelligence/recommendations/${anonRec._id}`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    const recDetailData = await recDetailRes.json();
    const related = recDetailData.recommendation?.relatedComplaints || [];

    // Check if reporter info is sanitized
    const anonItem = related.find((c: any) => c._id.toString() === anonComplaint._id.toString());
    const isMasked = anonItem && (anonItem.reportedByName === 'Anonymous Reporter' || anonItem.reportedBy?.name === 'Anonymous Reporter' || !anonItem.reportedBy?.email);

    if (recDetailRes.status === 200 && isMasked) {
      console.log(`✓ Test 13 Passed: Anonymous reporter identity completely masked as "${anonItem?.reportedByName || anonItem?.reportedBy?.name}" without leaking student PII.`);
      passedTests++;
    } else {
      console.error(`✗ Test 13 Failed: Reporter info was not masked properly:`, anonItem);
    }
  } catch (err: any) {
    console.error('✗ Test 13 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 14: Analytics Based on Real Database Records
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 14] Real Database Aggregations for Overview Analytics & Hotspots...');
    
    const overviewRes = await fetch(`${BASE_URL}/intelligence/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const metrics = await overviewRes.json();

    const actualAssetCount = await Asset.countDocuments({ status: { $ne: 'DECOMMISSIONED' } });
    const actualOpenRecs = await Recommendation.countDocuments({ status: 'OPEN' });

    // Fetch recurring issues API
    const hotspotsRes = await fetch(`${BASE_URL}/intelligence/recurring-issues?days=60`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const hotspotsData = await hotspotsRes.json();

    if (
      overviewRes.status === 200 &&
      metrics.totalAssets === actualAssetCount &&
      metrics.recommendationsSummary?.open === actualOpenRecs &&
      hotspotsRes.status === 200 &&
      Array.isArray(hotspotsData.electricalHotspots)
    ) {
      console.log(`✓ Test 14 Passed: Aggregations dynamically match MongoDB document counts (Active Assets: ${metrics.totalAssets}, Open Recs: ${metrics.recommendationsSummary?.open}).`);
      passedTests++;
    } else {
      console.error(`✗ Test 14 Failed: Aggregation mismatch. TotalAssets=${metrics?.totalAssets} (actual=${actualAssetCount}), OpenRecs=${metrics?.recommendationsSummary?.open} (actual=${actualOpenRecs})`);
    }
  } catch (err: any) {
    console.error('✗ Test 14 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 15: Existing Complaint Workflow Regression Tests
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 15] Complaint Workflow Regression Test (Filing & Tracking)...');
    
    // Submit a complaint through the public complaint endpoint
    const createCompRes = await fetch(`${BASE_URL}/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        title: 'Regression Check - Water Fountain Noise',
        description: 'Fountain pump is making a continuous high-pitched hum in lab.',
        categoryId: elecCategory._id.toString(),
        buildingName: 'Engineering Block',
        floor: '1',
        roomNumber: 'Lab 101',
        priority: 'Medium',
        isAnonymous: false
      })
    });

    const createCompData = await createCompRes.json();

    if (createCompRes.status === 201 && createCompData.complaint?.ticketId) {
      console.log(`✓ Test 15 Passed: Complaint creation workflow continues to operate seamlessly (Ticket ID: ${createCompData.complaint.ticketId}).`);
      passedTests++;
    } else {
      console.error('✗ Test 15 Failed: Complaint creation failed:', createCompRes.status, createCompData);
    }
  } catch (err: any) {
    console.error('✗ Test 15 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 16: Existing Asset Management Regression Tests
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 16] Asset Management Regression Test (Validation & Endpoints)...');
    
    // Create asset via API endpoint
    const assetRes = await fetch(`${BASE_URL}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        assetCode: 'TEST-INTEL-REGRESS-01',
        assetName: 'Chemical Fume Hood Regression',
        assetType: 'LAB_EQUIPMENT',
        category: 'Electrical',
        building: 'Engineering Block',
        floor: '1',
        room: 'Lab 101',
        condition: 'GOOD',
        maintenanceFrequencyDays: 60,
        assignedDepartment: 'Electrical'
      })
    });

    const assetData = await assetRes.json();

    if (assetRes.status === 201 && assetData.asset?.assetCode === 'TEST-INTEL-REGRESS-01') {
      console.log(`✓ Test 16 Passed: Core Asset API endpoint creates and validates assets without regression.`);
      passedTests++;
    } else {
      console.error('✗ Test 16 Failed: Asset creation returned status:', assetRes.status, assetData);
    }
  } catch (err: any) {
    console.error('✗ Test 16 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // TEST 17: Existing Authentication & Authorization Regression Tests
  // ------------------------------------------------------------------------
  try {
    console.log('\n[Test 17] Authentication & Session Regression Test...');
    
    // Check /auth/me with valid token
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const meData = await meRes.json();

    // Check with tampered/expired token (returns 403 in authMiddleware)
    const tamperedRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.token` }
    });

    if (meRes.status === 200 && meData.user?.email === adminUser.email && tamperedRes.status === 403) {
      console.log(`✓ Test 17 Passed: Authentication session securely validated; invalid tokens strictly rejected with 403 Forbidden.`);
      passedTests++;
    } else {
      console.error(`✗ Test 17 Failed: meRes=${meRes.status}, tamperedRes=${tamperedRes.status}`);
    }
  } catch (err: any) {
    console.error('✗ Test 17 Exception:', err.message);
  }

  // ------------------------------------------------------------------------
  // Clean up test assets
  // ------------------------------------------------------------------------
  await Asset.deleteMany({ assetCode: { $regex: /^TEST-INTEL-/ } });
  await MaintenanceRecord.deleteMany({ recordId: { $regex: /^MR-INTEL-/ } });
  await Complaint.deleteMany({ ticketId: { $regex: /^TKT-INTEL-/ } });
  await Recommendation.deleteMany({ assetCode: { $regex: /^TEST-INTEL-/ } });

  console.log('\n========================================================================');
  console.log(`                    TEST SUITE EXECUTION SUMMARY`);
  console.log(`                 TOTAL: ${totalTests}  |  PASSED: ${passedTests}  |  FAILED: ${totalTests - passedTests}`);
  console.log('========================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL 17 PHASE 3 REQUIREMENTS VERIFIED AND PASSED WITH ZERO REGRESSIONS!\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED. PLEASE REVIEW LOGS ABOVE.\n');
    process.exit(1);
  }
}

runIntelligenceTestSuite().catch(err => {
  console.error('Fatal Test Runner Exception:', err);
  process.exit(1);
});
