import { Response } from 'express';
import { Complaint, ComplaintStatus, ComplaintPriority } from '../models/Complaint';
import { Location } from '../models/Location';
import { Category } from '../models/Category';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';

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

    res.status(200).json({ duplicates });
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

    const { title, description, categoryId, buildingName, floor, roomNumber, priority, beforeImages } = req.body;

    if (!title || !description || !categoryId || !buildingName || !floor || !roomNumber) {
      res.status(400).json({ message: 'All fields (title, description, category, location) are required.' });
      return;
    }

    // Find or create location
    let locationDoc = await Location.findOne({ buildingName, floor, roomNumber });
    if (!locationDoc) {
      locationDoc = await Location.create({ buildingName, floor, roomNumber });
    }

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

    const newComplaint = await Complaint.create({
      ticketId,
      title,
      description,
      category: categoryId,
      categoryName: categoryDoc ? categoryDoc.name : 'General',
      location: locationDoc._id,
      locationDetails: { buildingName, floor, roomNumber },
      reportedBy: req.user.userId,
      reportedByName: req.user.name,
      priority: priority || 'Medium',
      assignedDepartment: defaultDept,
      beforeImages: beforeImages || [],
      afterImages: [],
      slaDueDate,
      status: 'Reported',
      timeline: [
        {
          status: 'Reported',
          updatedBy: req.user.userId as any,
          updatedByName: req.user.name,
          timestamp: new Date(),
          remarks: 'Complaint raised by user',
        },
      ],
    });

    res.status(201).json({
      message: 'Complaint submitted successfully.',
      complaint: newComplaint,
    });
  } catch (error: any) {
    console.error('Create Complaint Error:', error);
    res.status(500).json({ message: error.message || 'Server error while submitting complaint.' });
  }
};

export const getComplaints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { status, priority, building, department, search } = req.query;
    const query: any = {};

    // Role-based visibility
    if (req.user.role === 'STUDENT' || req.user.role === 'FACULTY') {
      // Show user's reported or upvoted complaints
      query.$or = [{ reportedBy: req.user.userId }, { upvotes: req.user.userId }];
    } else if (req.user.role === 'STAFF') {
      // Show complaints assigned to staff's department or directly to staff
      if (req.user.department) {
        query.$or = [{ assignedDepartment: req.user.department }, { assignedStaff: req.user.userId }];
      } else {
        query.assignedStaff = req.user.userId;
      }
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (department) query.assignedDepartment = department;
    if (building) query['locationDetails.buildingName'] = building;
    if (search) {
      query.$or = [
        { ticketId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'locationDetails.roomNumber': { $regex: search, $options: 'i' } },
      ];
    }

    const complaints = await Complaint.find(query)
      .populate('category', 'name icon defaultSLAHours')
      .populate('location', 'buildingName floor roomNumber')
      .populate('reportedBy', 'name email role phone')
      .populate('assignedStaff', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ complaints });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching complaints.' });
  }
};

export const getComplaintById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findById(id)
      .populate('category')
      .populate('location')
      .populate('reportedBy', 'name email role phone avatarUrl')
      .populate('assignedStaff', 'name email phone department avatarUrl')
      .populate('timeline.updatedBy', 'name role');

    if (!complaint) {
      res.status(404).json({ message: 'Complaint not found.' });
      return;
    }

    res.status(200).json({ complaint });
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

    const { id } = req.params;
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

    const { id } = req.params;
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

    const { id } = req.params;
    const { status, remarks } = req.body;

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

    const { id } = req.params;
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

    const { id } = req.params;
    const { rating, comment, isSatisfied } = req.body;

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      res.status(404).json({ message: 'Complaint not found.' });
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
      res.status(200).json({ message: 'Complaint re-opened for further maintenance.', complaint });
      return;
    }

    complaint.status = 'Closed';
    complaint.feedback = {
      rating: rating || 5,
      comment: comment || 'Verified and closed.',
      submittedAt: new Date(),
    };

    complaint.timeline.push({
      status: 'Closed',
      updatedBy: req.user.userId as any,
      updatedByName: req.user.name,
      timestamp: new Date(),
      remarks: `Verified & Closed with ${rating || 5}-star rating`,
    });

    await complaint.save();
    res.status(200).json({ message: 'Thank you! Complaint verified and closed successfully.', complaint });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error verifying complaint.' });
  }
};
