import { Response } from 'express';
import { Types } from 'mongoose';
import { Complaint, ComplaintStatus, ComplaintPriority } from '../models/Complaint';
import { Location } from '../models/Location';
import { Category } from '../models/Category';
import { User } from '../models/User';
import { Asset } from '../models/Asset';
import { AuthRequest } from '../middlewares/authMiddleware';
import { translateToEnglish, containsNonEnglishScript } from '../services/translationService';
import { 
  isHighRiskOrWomenSafety, 
  dispatchEmergencyAlert, 
  getEmergencyDispatchLogs 
} from '../services/emergencyNotificationService';
import {
  emitComplaintCreated,
  emitComplaintAssigned,
  emitComplaintStatusChanged,
} from '../services/socketService';

// Helper to sanitize complaint data and strip PII if isAnonymous is true
export const sanitizeComplaint = (doc: any, reqUser: any) => {
  if (!doc) return doc;
  const c = doc.toObject ? doc.toObject() : { ...doc };

  if (c.isAnonymous) {
    const isAuthor = reqUser && (
      (c.reportedBy?._id && c.reportedBy._id.toString() === reqUser.userId) ||
      (c.reportedBy && c.reportedBy.toString() === reqUser.userId) ||
      (c.reporterUserId?._id && c.reporterUserId._id.toString() === reqUser.userId) ||
      (c.reporterUserId && c.reporterUserId.toString() === reqUser.userId)
    );

    const roleLabel = c.reporterRole === 'FACULTY' 
      ? 'Anonymous Faculty' 
      : c.reporterRole === 'STUDENT' 
      ? 'Anonymous Student' 
      : 'Anonymous Reporter';

    if (isAuthor) {
      c.isAnonymous = true;
      c.reportedByName = `${reqUser.name} (Submitted Anonymously 🔒)`;
    } else if (reqUser && reqUser.role === 'ADMIN') {
      c.isAnonymous = true;
      c.reportedByName = `${roleLabel} 🔒`;
      c.reportedBy = {
        _id: c.reportedBy?._id || c.reportedBy,
        name: `${roleLabel} 🔒`,
        role: c.reporterRole || 'STUDENT',
        isAnonymous: true,
      };
      c.reporterUserId = undefined;
    } else if (reqUser && reqUser.role === 'STAFF') {
      // TECHNICIAN STAFF: Must NOT see reporter's name, register number, or contact info
      c.isAnonymous = true;
      c.reportedByName = 'Anonymous Reporter';
      c.reportedBy = {
        name: 'Anonymous Reporter',
        role: 'Anonymous Reporter',
        isAnonymous: true,
      };
      c.reporterUserId = undefined;
    } else {
      // Other students or unauthorized roles
      c.isAnonymous = true;
      c.reportedByName = roleLabel;
      c.reportedBy = {
        name: roleLabel,
        role: c.reporterRole || 'STUDENT',
        isAnonymous: true,
      };
      c.reporterUserId = undefined;
    }

    // Sanitize timeline entries created by the reporter
    if (Array.isArray(c.timeline)) {
      c.timeline = c.timeline.map((evt: any) => {
        const isReporterEntry = evt.status === 'Reported' || (
          evt.updatedBy && (
            (c.reportedBy?._id && evt.updatedBy.toString() === c.reportedBy._id.toString()) ||
            (typeof c.reportedBy === 'string' && evt.updatedBy.toString() === c.reportedBy) ||
            (c.reporterUserId && evt.updatedBy.toString() === c.reporterUserId.toString())
          )
        );
        if (isReporterEntry && !isAuthor) {
          const displayLabel = reqUser?.role === 'STAFF' ? 'Anonymous Reporter' : roleLabel;
          return {
            ...evt,
            updatedByName: displayLabel,
            updatedBy: undefined,
            remarks: evt.remarks?.includes('anonymously') ? evt.remarks : 'Complaint raised anonymously',
          };
        }
        return evt;
      });
    }
  }

  return c;
};

export const checkDuplicates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { buildingName, floor, roomNumber, categoryId } = req.query;

    if (!buildingName || !floor || !roomNumber) {
      res.status(400).json({ message: 'Building, floor, and room parameters are required.' });
      return;
    }

    const loc = await Location.findOne({ buildingName: String(buildingName), floor: String(floor), roomNumber: String(roomNumber) });
    if (!loc) {
      res.status(200).json({ duplicates: [] });
      return;
    }

    const query: any = {
      location: loc._id,
      status: { $nin: ['Closed', 'Verified'] },
    };

    if (categoryId) {
      query.category = categoryId;
    }

    const duplicates = await Complaint.find(query)
      .populate('category', 'name icon')
      .populate('reportedBy', 'name role')
      .sort({ createdAt: -1 });

    const sanitizedDuplicates = duplicates.map(d => sanitizeComplaint(d, req.user));

    res.status(200).json({ duplicates: sanitizedDuplicates });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error checking for duplicates.' });
  }
};

export const createComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { 
      title, 
      description, 
      categoryId, 
      subcategory,
      locationId,
      buildingName, 
      floor, 
      roomNumber, 
      priority, 
      beforeImages,
      isAnonymous,
      voiceTranscription,
      assetId,
      assetCode,
      incidentTimestamp,
    } = req.body;

    // Resolve location either by locationId or building/floor/room
    let locationDoc: any = null;
    if (locationId && Types.ObjectId.isValid(locationId)) {
      locationDoc = await Location.findById(locationId);
    }
    if (!locationDoc && buildingName && floor && roomNumber) {
      locationDoc = await Location.findOne({ buildingName, floor, roomNumber });
      if (!locationDoc) {
        locationDoc = await Location.create({ buildingName, floor, roomNumber });
      }
    } else if (!locationDoc && buildingName) {
      locationDoc = await Location.findOne({ buildingName });
    }

    if (!incidentTimestamp) {
      res.status(400).json({ message: 'Incident date and time is mandatory.' });
      return;
    }

    const parsedIncidentDate = new Date(incidentTimestamp);
    if (isNaN(parsedIncidentDate.getTime())) {
      res.status(400).json({ message: 'Invalid incident date and time format.' });
      return;
    }

    if (!title || !description || !categoryId || !locationDoc) {
      res.status(400).json({ message: 'All fields (title, description, category, location) are required.' });
      return;
    }

    const resolvedBuilding = locationDoc.buildingName || buildingName || locationDoc.zone || 'Campus Facilities';
    const resolvedFloor = locationDoc.floor || floor || 'Ground Floor';
    const resolvedRoom = locationDoc.roomNumber || roomNumber || locationDoc.name;
    const resolvedFullPath = locationDoc.fullPath || `${resolvedBuilding} > ${resolvedFloor} > ${resolvedRoom}`;

    // Fetch category for SLA and assigned default department
    const categoryDoc = await Category.findById(categoryId);
    const slaHours = categoryDoc ? categoryDoc.defaultSLAHours : 24;
    const defaultDept = categoryDoc ? categoryDoc.defaultDepartment : 'Maintenance Team';

    const slaDueDate = new Date();
    slaDueDate.setHours(slaDueDate.getHours() + slaHours);

    // Generate unique Ticket ID
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    const ticketId = `CMP-${year}-${randomCode}`;

    const isAnon = Boolean(isAnonymous);

    // Ensure title and description are translated to English for administrators and technical staff
    let finalTitle = title.trim();
    let finalDescription = description.trim();
    let finalVoiceTranscription = (voiceTranscription || description || '').trim();

    if (containsNonEnglishScript(finalDescription)) {
      try {
        const transResult = await translateToEnglish(finalDescription);
        if (transResult.translatedText) {
          finalDescription = transResult.translatedText;
          if (!voiceTranscription || voiceTranscription === description) {
            finalVoiceTranscription = `[Voice in ${transResult.sourceLanguageName}]: ${description.trim()}`;
          }
        }
      } catch (tErr) {
        console.warn('Auto-translation for description failed:', tErr);
      }
    }

    if (containsNonEnglishScript(finalTitle)) {
      try {
        const titleTrans = await translateToEnglish(finalTitle);
        if (titleTrans.translatedText) {
          finalTitle = titleTrans.translatedText;
        }
      } catch (tErr) {
        console.warn('Auto-translation for title failed:', tErr);
      }
    }

    // Evaluate High-Risk / Women Safety Emergency Condition
    const isEmergency = isHighRiskOrWomenSafety({
      title: finalTitle,
      description: finalDescription,
      categoryName: categoryDoc?.name,
      priority,
    });

    const isWomenSafetyIssue = /women|girl|harass|assault|stalk/i.test(`${finalTitle} ${finalDescription} ${categoryDoc?.name || ''}`);
    const resolvedPriority = isEmergency ? (priority === 'High' ? 'High' : 'Urgent') : (priority || 'Medium');
    const resolvedDept = isWomenSafetyIssue ? 'Security & Women Safety Cell' : defaultDept;

    // Optional Asset Association & Location Validation
    let linkedAsset: any = null;
    if (assetId || assetCode) {
      if (assetId) {
        linkedAsset = await Asset.findById(assetId);
      } else if (assetCode) {
        linkedAsset = await Asset.findOne({ assetCode: assetCode.toString().trim().toUpperCase() });
      }

      if (!linkedAsset) {
        res.status(400).json({ message: 'Selected campus asset does not exist.' });
        return;
      }

      // Verify asset location matches complaint location
      const bMatch = !linkedAsset.building || linkedAsset.building.trim().toLowerCase() === resolvedBuilding.trim().toLowerCase();
      const fMatch = !linkedAsset.floor || linkedAsset.floor.trim().toLowerCase() === resolvedFloor.trim().toLowerCase();
      const rMatch = !linkedAsset.room || linkedAsset.room.trim().toLowerCase() === resolvedRoom.trim().toLowerCase();

      if (!bMatch || !fMatch || !rMatch) {
        res.status(400).json({
          message: `Asset location mismatch: Asset '${linkedAsset.assetCode}' is located in ${linkedAsset.building}, ${linkedAsset.floor}, ${linkedAsset.room}, which does not match complaint location (${resolvedBuilding}, ${resolvedFloor}, ${resolvedRoom}).`,
        });
        return;
      }

      // Track complaint count on this asset and adjust asset status if high severity
      linkedAsset.complaintCount = (linkedAsset.complaintCount || 0) + 1;
      if (linkedAsset.status === 'ACTIVE' && (resolvedPriority === 'High' || resolvedPriority === 'Urgent')) {
        linkedAsset.status = 'IN_REPAIR';
      }
      await linkedAsset.save();
    }

    const newComplaint = await Complaint.create({
      ticketId,
      title: finalTitle,
      description: finalDescription,
      category: categoryId,
      categoryName: categoryDoc ? categoryDoc.name : 'General',
      subcategory: subcategory ? String(subcategory).trim() : undefined,
      location: locationDoc._id,
      locationPath: resolvedFullPath,
      locationDetails: {
        buildingName: resolvedBuilding,
        floor: resolvedFloor,
        roomNumber: resolvedRoom,
      },
      incidentTimestamp: parsedIncidentDate,
      reportedBy: req.user.userId,
      reporterUserId: req.user.userId,
      reportedByName: req.user.name,
      isAnonymous: isAnon,
      reporterRole: req.user.role,
      voiceTranscription: finalVoiceTranscription,
      priority: resolvedPriority,
      assignedDepartment: resolvedDept,
      beforeImages: beforeImages || [],
      afterImages: [],
      asset: linkedAsset ? linkedAsset._id : undefined,
      assetCode: linkedAsset ? linkedAsset.assetCode : undefined,
      assetName: linkedAsset ? linkedAsset.assetName : undefined,
      slaDueDate,
      status: 'Reported',
      isEmergency,
      timeline: [
        {
          status: 'Reported',
          updatedBy: req.user.userId as any,
          updatedByName: isAnon ? 'Anonymous Reporter' : req.user.name,
          timestamp: new Date(),
          remarks: isAnon ? 'Complaint raised anonymously' : 'Complaint raised by user',
        },
      ],
    });

    // If High Risk or Women Safety, dispatch instant SMS notification to HOD & Coordinators
    if (isEmergency) {
      try {
        const alertResult = await dispatchEmergencyAlert(newComplaint, categoryDoc ? categoryDoc.name : undefined);
        newComplaint.emergencyAlertSent = true;
        newComplaint.emergencyRecipients = alertResult.recipients;
        newComplaint.emergencySentAt = new Date();

        newComplaint.timeline.push({
          status: 'Escalated',
          updatedByName: 'Emergency Mobile SMS Gateway',
          timestamp: new Date(),
          remarks: `🚨 EMERGENCY SMS DISPATCHED: Mobile alert sent to HOD & Coordinators (${alertResult.recipients.join(', ')}) for immediate response.`,
        });

        await newComplaint.save();
      } catch (smsErr) {
        console.error('Failed to dispatch emergency SMS notification:', smsErr);
      }
    }

    // Real-time Socket.IO emission
    emitComplaintCreated(newComplaint);

    const sanitized = sanitizeComplaint(newComplaint, req.user);

    res.status(201).json({
      message: isEmergency
        ? 'Emergency complaint submitted successfully. HOD and Coordinators have been alerted via mobile SMS!'
        : 'Complaint submitted successfully.',
      complaint: sanitized,
      emergencyAlertSent: isEmergency,
    });
  } catch (error: any) {
    console.error('Create Complaint Error:', error);
    res.status(500).json({ message: error.message || 'Server error while submitting complaint.' });
  }
};

export const translateVoiceInput = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text, sourceLang } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ message: 'Text to translate is required.' });
      return;
    }

    const result = await translateToEnglish(text, sourceLang);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Translation endpoint error:', error);
    res.status(500).json({ message: error.message || 'Translation service failed.' });
  }
};

export const getComplaints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { status, priority, building, department, search, type, isAnonymous } = req.query;
    const query: any = {};

    const andConditions: any[] = [];

    // Role-based visibility
    if (req.user.role === 'STUDENT' || req.user.role === 'FACULTY') {
      // Show user's reported or upvoted complaints
      andConditions.push({
        $or: [{ reportedBy: req.user.userId }, { upvotes: req.user.userId }],
      });
    } else if (req.user.role === 'STAFF') {
      // Show complaints assigned to staff's department or directly to staff
      if (req.user.department) {
        andConditions.push({
          $or: [{ assignedDepartment: req.user.department }, { assignedStaff: req.user.userId }],
        });
      } else {
        andConditions.push({ assignedStaff: req.user.userId });
      }
    }

    // Filter by Anonymous / Named if specified
    if (type === 'anonymous' || isAnonymous === 'true') {
      query.isAnonymous = true;
    } else if (type === 'named' || isAnonymous === 'false') {
      query.isAnonymous = { $ne: true };
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (department) query.assignedDepartment = department;
    if (building) query['locationDetails.buildingName'] = building;
    if (search) {
      andConditions.push({
        $or: [
          { ticketId: { $regex: search, $options: 'i' } },
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { assetCode: { $regex: search, $options: 'i' } },
          { 'locationDetails.roomNumber': { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    const complaints = await Complaint.find(query)
      .populate('category', 'name icon defaultSLAHours')
      .populate('location', 'buildingName floor roomNumber')
      .populate('reportedBy', 'name email role phone')
      .populate('assignedStaff', 'name email phone')
      .populate('asset', 'assetCode assetName assetType condition status')
      .sort({ createdAt: -1 });

    const sanitizedComplaints = complaints.map(c => sanitizeComplaint(c, req.user));

    res.status(200).json({ complaints: sanitizedComplaints });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching complaints.' });
  }
};

export const getComplaintById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid complaint ID format.' });
      return;
    }

    const complaint = await Complaint.findById(id)
      .populate('category')
      .populate('location')
      .populate('asset')
      .populate('reportedBy', 'name email role phone avatarUrl')
      .populate('assignedStaff', 'name email phone department avatarUrl')
      .populate('timeline.updatedBy', 'name role');

    if (!complaint) {
      res.status(404).json({ message: 'Complaint not found.' });
      return;
    }

    const sanitized = sanitizeComplaint(complaint, req.user);
    res.status(200).json({ complaint: sanitized });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error retrieving complaint.' });
  }
};

export const upvoteComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid complaint ID format.' });
      return;
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      res.status(404).json({ message: 'Complaint not found.' });
      return;
    }

    const userIdObj: any = req.user.userId;
    const hasUpvoted = complaint.upvotes.some((u) => u.toString() === req.user?.userId);

    if (hasUpvoted) {
      complaint.upvotes = complaint.upvotes.filter((u) => u.toString() !== req.user?.userId);
    } else {
      complaint.upvotes.push(userIdObj);
    }

    await complaint.save();
    res.status(200).json({
      message: hasUpvoted ? 'Upvote removed.' : 'Upvoted complaint.',
      upvotesCount: complaint.upvotes.length,
      hasUpvoted: !hasUpvoted,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error upvoting complaint.' });
  }
};

export const assignComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ message: 'Admin access required to assign complaints.' });
      return;
    }

    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid complaint ID format.' });
      return;
    }

    const { department, staffId, priority } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({ message: 'Complaint not found.' });
      return;
    }

    if (department) complaint.assignedDepartment = department;
    if (priority) complaint.priority = priority as ComplaintPriority;

    let staffName = '';
    if (staffId) {
      const staffUser = await User.findById(staffId);
      if (staffUser) {
        complaint.assignedStaff = staffUser._id as any;
        complaint.assignedStaffName = staffUser.name;
        staffName = staffUser.name;
      }
    }

    complaint.status = 'Assigned';
    complaint.timeline.push({
      status: 'Assigned',
      updatedBy: req.user.userId as any,
      updatedByName: req.user.name,
      timestamp: new Date(),
      remarks: `Assigned to ${department || 'department'}${staffName ? ` (${staffName})` : ''}`,
    });

    await complaint.save();
    emitComplaintAssigned(complaint);
    res.status(200).json({ message: 'Complaint assigned successfully.', complaint });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error assigning complaint.' });
  }
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid complaint ID format.' });
      return;
    }

    if (req.user.role === 'STUDENT' || req.user.role === 'FACULTY') {
      res.status(403).json({ message: 'Students and faculty are not authorized to update maintenance status directly.' });
      return;
    }

    const { status, remarks } = req.body;
    const VALID_STATUSES: ComplaintStatus[] = [
      'Reported', 'Assigned', 'Accepted', 'In Progress', 'Resolved', 'Verified', 'Closed', 'Escalated'
    ];

    if (!status || !VALID_STATUSES.includes(status as ComplaintStatus)) {
      res.status(400).json({ message: `Invalid complaint status: ${status}` });
      return;
    }

    if (req.user.role === 'STAFF') {
      if (status === 'Closed' || status === 'Verified') {
        res.status(403).json({ message: 'Technicians cannot verify or close tickets. Student reporter verification required.' });
        return;
      }
      if (status === 'Resolved') {
        res.status(400).json({ message: 'To mark a ticket as Resolved, submit work completion via the /resolve endpoint with photo evidence.' });
        return;
      }
      if (!['Accepted', 'In Progress'].includes(status)) {
        res.status(403).json({ message: `Staff cannot transition ticket to status '${status}'.` });
        return;
      }
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({ message: 'Complaint not found.' });
      return;
    }

    complaint.status = status as ComplaintStatus;

    if (status === 'Accepted' && req.user.role === 'STAFF') {
      complaint.assignedStaff = req.user.userId as any;
      complaint.assignedStaffName = req.user.name;
    }

    complaint.timeline.push({
      status: status as ComplaintStatus,
      updatedBy: req.user.userId as any,
      updatedByName: req.user.name,
      timestamp: new Date(),
      remarks: remarks || `Status updated to ${status}`,
    });

    await complaint.save();
    emitComplaintStatusChanged(complaint);
    res.status(200).json({ message: `Status updated to ${status}.`, complaint });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error updating status.' });
  }
};

export const resolveComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || (req.user.role !== 'STAFF' && req.user.role !== 'ADMIN')) {
      res.status(403).json({ message: 'Maintenance staff or Admin permission required.' });
      return;
    }

    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid complaint ID format.' });
      return;
    }

    const { afterImages, resolutionNotes } = req.body;

    if (!afterImages || afterImages.length === 0) {
      res.status(400).json({ message: 'Proof of work photo (After Image) is required to resolve complaint.' });
      return;
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({ message: 'Complaint not found.' });
      return;
    }

    complaint.afterImages = afterImages;
    complaint.resolutionNotes = resolutionNotes || 'Work completed by technician.';
    complaint.status = 'Resolved';

    complaint.timeline.push({
      status: 'Resolved',
      updatedBy: req.user.userId as any,
      updatedByName: req.user.name,
      timestamp: new Date(),
      remarks: `Resolution submitted: ${resolutionNotes || 'Work complete'}`,
    });

    await complaint.save();
    emitComplaintStatusChanged(complaint);
    res.status(200).json({ message: 'Complaint marked as Resolved. Pending student verification.', complaint });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error resolving complaint.' });
  }
};

export const verifyComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid complaint ID format.' });
      return;
    }

    const { rating, comment, isSatisfied } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({ message: 'Complaint not found.' });
      return;
    }

    // Authorization check: Only original reporter or an ADMIN can verify/close or reopen
    const isReporter = Boolean(
      req.user && (
        (complaint.reportedBy && complaint.reportedBy.toString() === req.user.userId) ||
        (complaint.reporterUserId && complaint.reporterUserId.toString() === req.user.userId)
      )
    );
    const isAdmin = req.user.role === 'ADMIN';

    if (!isReporter && !isAdmin) {
      res.status(403).json({ message: 'Access denied: Only the original complaint author or an administrator can verify and rate this service.' });
      return;
    }

    if (isSatisfied === false) {
      // Reopen ticket
      complaint.status = 'In Progress';
      complaint.timeline.push({
        status: 'In Progress',
        updatedBy: req.user.userId as any,
        updatedByName: req.user.name,
        timestamp: new Date(),
        remarks: `Student requested re-inspection: ${comment || 'Issue not completely resolved'}`,
      });
      await complaint.save();
      emitComplaintStatusChanged(complaint);
      res.status(200).json({ message: 'Complaint re-opened for further maintenance.', complaint });
      return;
    }

    const finalRating = rating !== undefined ? Math.max(1, Math.min(5, Math.round(Number(rating)) || 5)) : 5;

    complaint.status = 'Closed';
    complaint.feedback = {
      rating: finalRating,
      comment: comment || 'Verified and closed.',
      submittedAt: new Date(),
    };

    complaint.timeline.push({
      status: 'Closed',
      updatedBy: req.user.userId as any,
      updatedByName: req.user.name,
      timestamp: new Date(),
      remarks: `Verified & Closed with ${finalRating}-star rating`,
    });

    await complaint.save();
    emitComplaintStatusChanged(complaint);
    res.status(200).json({ message: 'Thank you! Complaint verified and closed successfully.', complaint });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error verifying complaint.' });
  }
};

/**
 * Manually trigger or re-send emergency mobile SMS alert to HOD & Coordinators
 */
export const triggerEmergencyAlertManual = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findById(id);

    if (!complaint) {
      res.status(404).json({ message: 'Complaint not found.' });
      return;
    }

    const alertResult = await dispatchEmergencyAlert(complaint);
    complaint.isEmergency = true;
    complaint.emergencyAlertSent = true;
    complaint.emergencyRecipients = alertResult.recipients;
    complaint.emergencySentAt = new Date();

    const triggeredByName = req.user?.name || 'Administrator';

    complaint.timeline.push({
      status: 'Escalated',
      updatedBy: req.user?.userId as any,
      updatedByName: `${triggeredByName} (Emergency Action)`,
      timestamp: new Date(),
      remarks: `🚨 MANUAL EMERGENCY SMS ALERT SENT: Dispatched to HOD & Coordinators (${alertResult.recipients.join(', ')})`,
    });

    await complaint.save();

    res.status(200).json({
      message: `Emergency SMS alert successfully dispatched to ${alertResult.recipients.join(', ')}`,
      recipients: alertResult.recipients,
      logs: alertResult.logs,
      complaint,
    });
  } catch (error: any) {
    console.error('Trigger Emergency Alert Error:', error);
    res.status(500).json({ message: error.message || 'Error sending emergency alert.' });
  }
};

/**
 * Retrieve recent emergency SMS dispatch audit logs
 */
export const getEmergencyLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = getEmergencyDispatchLogs();
    res.status(200).json({ logs });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error retrieving emergency dispatch logs.' });
  }
};
