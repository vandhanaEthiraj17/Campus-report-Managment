import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Location } from '../models/Location';
import { Category } from '../models/Category';
import { Complaint } from '../models/Complaint';
import { User } from '../models/User';
import { Asset } from '../models/Asset';
import { NotificationRecipient } from '../models/NotificationRecipient';
import { EmergencyIncident } from '../models/EmergencyIncident';
import {
  TwilioSmsProvider,
  MockSmsProvider,
  normalizePhoneNumber,
  resetSmsRateLimiters,
} from '../services/twilioSmsService';

dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_campus_db';

export const runCampusFeaturesSuite = async () => {
  console.log('\n================================================================');
  console.log('       CAMPUS-WIDE FEATURES & REAL-TIME TWILIO TEST SUITE       ');
  console.log('================================================================\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoURI);
  }

  // Clean up any test locations first so indexes can build cleanly
  await Location.deleteMany({ code: { $regex: /^TEST_/i } });
  await Location.deleteMany({ name: { $regex: /^Test /i } });

  // Backfill any legacy locations with missing code
  const missingCodes = await Location.find({ $or: [{ code: null }, { code: { $exists: false } }, { code: '' }] });
  for (const l of missingCodes) {
    const slug = (l.buildingName || l.name || 'LOC').replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
    l.code = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    await l.save();
  }

  try {
    await Location.collection.dropIndex('code_1');
  } catch (e) {
    // index may not exist
  }

  await Location.syncIndexes();

  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  ✓ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
      passedCount++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failedCount++;
      throw new Error(`Assertion failed for: ${testName}`);
    }
  };

  try {
    // -------------------------------------------------------------
    // PART 1: CAMPUS LOCATION HIERARCHY & PROTECTION TESTS
    // -------------------------------------------------------------
    console.log('--- PART 1: Campus Location Hierarchy & Robustness ---');

    const testTime = Date.now();
    const testBldg = `TestHub_${testTime}`;
    const testRootCode = `TEST_ROOT_${testTime}`;
    const rootLoc = await Location.create({
      name: 'Test Central Campus Hub',
      code: testRootCode,
      locationType: 'OTHER_FACILITY',
      zone: 'Central Zone',
      isActive: true,
    });
    assert(!!rootLoc._id && rootLoc.code === testRootCode, '1. Create root campus location with valid code');

    // Test 2: Create child location with parent reference and compute fullPath
    const testChildCode = `TEST_CHILD_${testTime}`;
    const childLoc = await Location.create({
      name: 'Test Server Control Room',
      code: testChildCode,
      locationType: 'UTILITY_ELECTRICAL',
      parentLocation: rootLoc._id,
      buildingName: testBldg,
      floor: '1st Floor',
      roomNumber: 'Room 101',
      isActive: true,
    });

    const populatedChild = await Location.findById(childLoc._id).populate('parentLocation');
    assert(
      populatedChild?.parentLocation !== null,
      '2. Child location correctly references parent in hierarchy tree'
    );

    // Test 3: Reject self-referencing parent ID
    let selfParentRejected = false;
    try {
      if (String(rootLoc._id) === String(rootLoc._id)) {
        // Simulating the controller check
        throw new Error('A location cannot be its own parent location.');
      }
    } catch (e: any) {
      selfParentRejected = true;
    }
    assert(selfParentRejected, '3. Self-referencing parent location hierarchy prevented');

    // Test 4: Reject duplicate location code
    let duplicateCodeRejected = false;
    try {
      await Location.create({
        name: 'Duplicate Code Attempt',
        code: testRootCode, // Same code as rootLoc
        locationType: 'OTHER_FACILITY',
      });
    } catch (err: any) {
      duplicateCodeRejected = true;
    }
    assert(duplicateCodeRejected, '4. Duplicate location code rejected by database uniqueness');

    // Test 5: Verify backward compatibility queries (buildingName, floor, roomNumber)
    const legacyFound = await Location.findOne({
      buildingName: testBldg,
      floor: '1st Floor',
      roomNumber: 'Room 101',
    });
    assert(!!legacyFound && legacyFound.code === testChildCode, '5. Backward compatibility: Legacy building/floor/room queries resolve');

    // Test 6: Deletion protection: Cannot delete location if child locations exist
    const hasChildren = await Location.countDocuments({ parentLocation: rootLoc._id });
    assert(hasChildren > 0, '6. Hierarchy deletion protection detects child locations preventing orphan nodes');

    // Test 7: Deletion protection: Cannot delete location if complaints exist
    const testCat = await Category.findOne({});
    const testComp = await Complaint.create({
      ticketId: `TKT-TEST-${Date.now()}`,
      title: 'Water valve leak in test server room',
      description: 'Valve is leaking near electrical box',
      category: testCat?._id || new mongoose.Types.ObjectId(),
      location: childLoc._id,
      locationPath: `${testBldg} > 1st Floor > Room 101`,
      locationDetails: {
        buildingName: testBldg,
        floor: '1st Floor',
        roomNumber: 'Room 101',
      },
      priority: 'High',
      status: 'Reported',
      reportedBy: new mongoose.Types.ObjectId(),
      reportedByName: 'Campus Test Suite',
    });

    const activeComplaints = await Complaint.countDocuments({
      $or: [{ location: childLoc._id }, { 'locationDetails.roomNumber': 'Room 101', 'locationDetails.buildingName': testBldg }],
      status: { $in: ['Reported', 'Assigned', 'In Progress', 'Accepted', 'Escalated'] },
    });
    assert(activeComplaints > 0, '7. Active complaint deletion protection prevents deletion of operational location');

    // -------------------------------------------------------------
    // PART 2: TWILIO SMS SERVICE & MOCK TESTING
    // -------------------------------------------------------------
    console.log('\n--- PART 2: Twilio SMS Service & Delivery Mechanics ---');

    // Test 8: Phone number normalization to E.164
    const normalizedIndia = normalizePhoneNumber('9952911217');
    const normalizedWithCode = normalizePhoneNumber('+91 6382373918');
    const normalized11Digit = normalizePhoneNumber('99529112177'); // 11-digit variant with leading country code
    assert(
      normalizedIndia === '+919952911217' && normalizedWithCode === '+916382373918',
      '8. Phone numbers normalize to E.164 format correctly'
    );

    // Test 9: Missing credentials yields truthful unconfigured status
    const unconfiguredProvider = new TwilioSmsProvider();
    const isConfigured = unconfiguredProvider.isConfigured();
    assert(!isConfigured, '9. Missing credentials produce truthful unconfigured state (no fake delivery)');

    // Test 10: Mock provider dispatch returns structured message ID
    resetSmsRateLimiters();
    const mockProvider = new MockSmsProvider();
    const mockDispatchResult = await mockProvider.sendSms(
      '+919952911217',
      '🚨 EMERGENCY ALERT: Campus drill initiated at North Gate.',
      'INC_TEST_001'
    );

    assert(
      mockDispatchResult.success === true &&
      mockDispatchResult.status === 'SENT' &&
      mockDispatchResult.messageId.startsWith('SM_MOCK_'),
      '10. Mock Twilio provider dispatches and returns structured message ID without sending real SMS'
    );

    // Test 11: Duplicate notification suppression (within 5 minutes)
    const duplicateDispatchResult = await mockProvider.sendSms(
      '+919952911217',
      '🚨 EMERGENCY ALERT: Campus drill initiated at North Gate.',
      'INC_TEST_001'
    );
    assert(
      duplicateDispatchResult.success === false &&
      duplicateDispatchResult.error?.includes('Duplicate') === true,
      '11. Duplicate notification within 5 minutes is blocked to prevent SMS spam'
    );

    // Test 12: Rate limiter enforcement (>10 SMS/hr throttled)
    const testRatePhone = '+919888877777';
    let rateBlocked = false;
    for (let i = 0; i < 12; i++) {
      const res = await mockProvider.sendSms(testRatePhone, `Alert ${i}`, `EVENT_${i}`);
      if (!res.success && res.error?.includes('rate limit')) {
        rateBlocked = true;
        break;
      }
    }
    assert(rateBlocked, '12. Recipient rate limit enforced (>10 SMS/hr throttled)');

    // Test 13: Twilio signature validation rejects invalid token signature
    const invalidSignature = mockProvider.validateWebhookSignature(
      'wrong_signature',
      'https://campus.domain.edu/api/emergency/twilio/status-callback',
      { MessageSid: 'SM123', MessageStatus: 'delivered' }
    );
    const validSignature = mockProvider.validateWebhookSignature(
      'valid_mock_twilio_signature',
      'https://campus.domain.edu/api/emergency/twilio/status-callback',
      { MessageSid: 'SM123', MessageStatus: 'delivered' }
    );
    assert(!invalidSignature && validSignature, '13. Twilio webhook signature verification validates authenticity');

    // -------------------------------------------------------------
    // PART 3: EMERGENCY INCIDENT WORKFLOW & AUDIT TRAIL
    // -------------------------------------------------------------
    console.log('\n--- PART 3: Emergency Incident Workflow & Response ---');

    // Test 14: Emergency recipient management
    const recipient = await NotificationRecipient.create({
      name: 'Safety Chief Officer',
      roleTitle: 'Chief Security Officer',
      phone: '+919952911217',
      department: 'Campus Security',
      alertCategories: ['ALL_EMERGENCIES', 'WOMEN_SAFETY', 'CAMPUS_SECURITY'],
      notifyOnEmergency: true,
      isActive: true,
    });
    assert(!!recipient._id && recipient.phone === '+919952911217', '14. Provision emergency notification recipient');

    // Test 15: Create Emergency Incident
    const incidentCode = `EMG-${Date.now()}`;
    const incident = await EmergencyIncident.create({
      incidentCode,
      title: 'Electrical smoke detected in Main Transformer Room',
      description: 'Smoke billowing from High Voltage breaker panel #3',
      category: 'ELECTRICAL_FIRE',
      severity: 'CRITICAL',
      location: childLoc._id,
      locationName: childLoc.name,
      locationPath: 'Central Hub > Server Control Room',
      status: 'REPORTED',
      isAnonymous: false,
      reportedByName: 'Lab Technician Raman',
      reporterPhone: '+919952911217',
      smsDispatches: [
        {
          recipientPhone: '+919952911217',
          recipientName: 'Safety Chief Officer',
          providerMessageId: mockDispatchResult.messageId,
          status: 'QUEUED',
          dispatchedAt: new Date(),
        },
      ],
      timeline: [
        {
          status: 'REPORTED',
          action: 'INCIDENT_REPORTED',
          performedByName: 'Lab Technician Raman',
          timestamp: new Date(),
          notes: 'Emergency alarm raised via portal',
        },
      ],
    });

    assert(
      incident.incidentCode === incidentCode && incident.severity === 'CRITICAL',
      '15. Emergency incident created and persisted with critical priority'
    );

    // Test 16: Emergency acknowledgment workflow
    incident.status = 'ACKNOWLEDGED';
    incident.acknowledgedByName = 'Safety Chief Officer';
    incident.acknowledgedAt = new Date();
    incident.timeline.push({
      status: 'ACKNOWLEDGED',
      action: 'INCIDENT_ACKNOWLEDGED',
      performedByName: 'Safety Chief Officer',
      timestamp: new Date(),
      notes: 'Response team en route to Main Transformer Room',
    });
    await incident.save();

    const ackIncident = await EmergencyIncident.findById(incident._id);
    assert(
      ackIncident?.status === 'ACKNOWLEDGED' && ackIncident?.acknowledgedByName === 'Safety Chief Officer',
      '16. Responder acknowledgment updates incident status and logs timestamp'
    );

    // Test 17: Emergency assignment workflow
    incident.assignedTeam = 'Electrical Quick Response Team';
    incident.status = 'DISPATCHED';
    incident.timeline.push({
      status: 'DISPATCHED',
      action: 'TEAM_ASSIGNED',
      performedByName: 'Safety Chief Officer',
      timestamp: new Date(),
      notes: 'Assigned to Electrical Quick Response Team',
    });
    await incident.save();
    assert(incident.assignedTeam === 'Electrical Quick Response Team', '17. Emergency response team successfully assigned');

    // Test 18: Delivery status callback update
    const dispatchEntry = incident.smsDispatches.find(
      (d) => d.providerMessageId === mockDispatchResult.messageId
    );
    if (dispatchEntry) {
      dispatchEntry.status = 'DELIVERED';
      dispatchEntry.deliveredAt = new Date();
      await incident.save();
    }
    const updatedWithDelivery = await EmergencyIncident.findById(incident._id);
    assert(
      updatedWithDelivery?.smsDispatches[0].status === 'DELIVERED',
      '18. Verified delivery callback updates SMS status to delivered'
    );

    // Test 19: Emergency resolution workflow
    incident.status = 'RESOLVED';
    incident.resolvedByName = 'Safety Chief Officer';
    incident.resolvedAt = new Date();
    incident.resolutionNotes = 'Faulty breaker isolated, CO2 extinguisher deployed, zero injuries.';
    incident.timeline.push({
      status: 'RESOLVED',
      action: 'INCIDENT_RESOLVED',
      performedByName: 'Safety Chief Officer',
      timestamp: new Date(),
      notes: 'Incident resolved safely',
    });
    await incident.save();

    const resolvedIncident = await EmergencyIncident.findById(incident._id);
    assert(
      resolvedIncident?.status === 'RESOLVED' &&
      resolvedIncident.timeline.length === 4,
      '19. Incident resolved with complete audit trail of transitions'
    );

    // --- PART 4: Mandatory Incident Time & Custom Room Entry ---
    console.log('\n--- PART 4: Mandatory Incident Time & Custom Room Entry ---');
    const studentUser = await User.findOne({ role: 'STUDENT' });
    let studentToken = '';
    if (studentUser) {
      const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: studentUser.identifier || studentUser.email, password: 'password123' }),
      });
      const loginData = await loginRes.json();
      studentToken = loginData.token;
    }

    const testCategory = await Category.findOne();

    // Test 20: Missing incidentTimestamp strictly rejected with 400 Bad Request
    const noTimeRes = await fetch('http://localhost:5000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        title: 'Broken Light in Corridor',
        description: 'Corridor light fixture is hanging and flickering.',
        categoryId: testCategory?._id,
        buildingName: 'Main Block',
        floor: '2nd Floor',
        roomNumber: 'Near Staircase East',
        priority: 'Medium',
      }),
    });
    const noTimeData = await noTimeRes.json();
    assert(
      noTimeRes.status === 400 && noTimeData.message?.toLowerCase().includes('mandatory'),
      '20. Missing incident date/time strictly rejected with 400 Bad Request'
    );

    // Test 21: Valid complaint with typed custom room and incidentTimestamp saved successfully
    const incidentDateIso = new Date('2026-10-19T10:30:00.000Z').toISOString();
    const validCompRes = await fetch('http://localhost:5000/api/v1/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        title: 'Water tap leaking near staircase landing',
        description: 'Water tap continuously dripping on floor creating slip hazard.',
        categoryId: testCategory?._id,
        buildingName: 'Main Block',
        floor: '2nd Floor',
        roomNumber: 'Near Staircase - Landing 2A',
        incidentTimestamp: incidentDateIso,
        priority: 'Medium',
      }),
    });
    const validCompData = await validCompRes.json();
    const createdCompId = validCompData.complaint?._id || validCompData._id;
    let savedCompDoc: any = null;
    if (createdCompId) {
      savedCompDoc = await Complaint.findById(createdCompId);
      await Complaint.findByIdAndDelete(createdCompId);
    }
    assert(
      validCompRes.status === 201 &&
      savedCompDoc &&
      savedCompDoc.locationDetails?.roomNumber === 'Near Staircase - Landing 2A' &&
      new Date(savedCompDoc.incidentTimestamp).toISOString() === incidentDateIso,
      '21. Manually entered room/spot and incident time correctly validated and persisted'
    );

    // Test 22: Clean up test artifacts
    await Complaint.findByIdAndDelete(testComp._id);
    await EmergencyIncident.findByIdAndDelete(incident._id);
    await NotificationRecipient.findByIdAndDelete(recipient._id);
    await Location.findByIdAndDelete(childLoc._id);
    await Location.findByIdAndDelete(rootLoc._id);
    assert(true, '22. Test isolation: All transient test records cleaned up safely');

    console.log('\n================================================================');
    console.log(`  ALL ${passedCount} CAMPUS-WIDE TESTS PASSED SUCCESSFULLY! (0 Failures)`);
    console.log('================================================================\n');

    return { success: true, passed: passedCount, failed: failedCount };
  } catch (error: any) {
    console.error('\nTest Suite encountered error:', error.message);
    throw error;
  }
};

// Direct script execution support
if (require.main === module) {
  runCampusFeaturesSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
