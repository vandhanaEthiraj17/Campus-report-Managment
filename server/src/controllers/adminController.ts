import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { Complaint } from '../models/Complaint';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getAnalyticsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const anonymousCount = await Complaint.countDocuments({ isAnonymous: true });
    const reportedCount = await Complaint.countDocuments({ status: 'Reported' });
    const inProgressCount = await Complaint.countDocuments({ status: { $in: ['Assigned', 'Accepted', 'In Progress'] } });
    const resolvedCount = await Complaint.countDocuments({ status: 'Resolved' });
    const closedCount = await Complaint.countDocuments({ status: 'Closed' });
    const escalatedCount = await Complaint.countDocuments({ isEscalated: true });

    // Category breakdown
    const categoryStats = await Complaint.aggregate([
      { $group: { _id: '$categoryName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Building breakdown
    const buildingStats = await Complaint.aggregate([
      { $group: { _id: '$locationDetails.buildingName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Priority breakdown
    const priorityStats = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // Staff Workload
    const staffWorkload = await User.aggregate([
      { $match: { role: 'STAFF' } },
      {
        $lookup: {
          from: 'complaints',
          localField: '_id',
          foreignField: 'assignedStaff',
          as: 'assignedComplaints',
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          department: 1,
          activeCount: {
            $size: {
              $filter: {
                input: '$assignedComplaints',
                as: 'c',
                cond: { $in: ['$$c.status', ['Assigned', 'Accepted', 'In Progress']] },
              },
            },
          },
          totalCompleted: {
            $size: {
              $filter: {
                input: '$assignedComplaints',
                as: 'c',
                cond: { $in: ['$$c.status', ['Resolved', 'Closed']] },
              },
            },
          },
        },
      },
    ]);

    res.status(200).json({
      metrics: {
        totalComplaints,
        anonymousCount,
        reportedCount,
        inProgressCount,
        resolvedCount,
        closedCount,
        escalatedCount,
      },
      categoryStats,
      buildingStats,
      priorityStats,
      staffWorkload,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error generating analytics overview.' });
  }
};

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, department } = req.query;
    const query: any = {};
    if (role) query.role = role;
    if (department) query.department = department;

    const users = await User.find(query).select('-passwordHash').sort({ role: 1, name: 1 });
    res.status(200).json({ users });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching users.' });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const { userId } = req.params;
    const { role, department, isActive } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    const oldRole = user.role;
    const oldIsActive = user.isActive;
    const oldDepartment = user.department;

    let hasChanges = false;
    let auditAction = '';
    const auditDetails: any = {};

    if (role && role !== oldRole) {
      user.role = role;
      hasChanges = true;
      auditAction = 'ROLE_CHANGE';
      auditDetails.oldRole = oldRole;
      auditDetails.newRole = role;
    }

    if (isActive !== undefined && isActive !== oldIsActive) {
      user.isActive = isActive;
      hasChanges = true;
      auditAction = isActive ? 'USER_ACTIVATION' : 'USER_DEACTIVATION';
      auditDetails.oldIsActive = oldIsActive;
      auditDetails.newIsActive = isActive;
    }

    if (department !== undefined && department !== oldDepartment) {
      user.department = department;
      hasChanges = true;
      if (!auditAction) {
        auditAction = 'PROFILE_UPDATE';
      }
      auditDetails.oldDepartment = oldDepartment;
      auditDetails.newDepartment = department;
    }

    if (hasChanges) {
      await user.save();

      // Log the change in AuditLog
      await AuditLog.create({
        action: auditAction,
        performedBy: req.user.userId,
        performedByName: req.user.name,
        targetUser: user._id,
        targetUserName: user.name,
        details: auditDetails,
      });
    }

    res.status(200).json({ message: 'User profile updated successfully.', user });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error updating user profile.' });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const { name, email, password, role, department, phone } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ message: 'Name, email, password, and role are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify official domain
    const domain = process.env.COLLEGE_EMAIL_DOMAIN || '@adhiyamaan.ac.in';
    const expectedDomain = domain.startsWith('@') ? domain : `@${domain}`;
    if (!normalizedEmail.endsWith(expectedDomain.toLowerCase())) {
      res.status(400).json({ message: 'Please use your official college email address.' });
      return;
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists.' });
      return;
    }

    if (!['FACULTY', 'STAFF'].includes(role)) {
      res.status(400).json({ message: 'Only Faculty and Staff roles can be created by Admin.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role,
      department: department || '',
      phone: phone || '',
      isActive: true,
      isEmailVerified: false, // Must verify on first login/OTP send
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    });

    // Log the user creation action
    await AuditLog.create({
      action: 'USER_CREATION',
      performedBy: req.user.userId,
      performedByName: req.user.name,
      targetUser: newUser._id,
      targetUserName: newUser.name,
      details: { role, department },
    });

    res.status(201).json({
      message: `${role} account created successfully. User must verify email on first login.`,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        phone: newUser.phone,
        isActive: newUser.isActive,
        isEmailVerified: newUser.isEmailVerified,
      },
    });
  } catch (error: any) {
    console.error('Admin Create User Error:', error);
    res.status(500).json({ message: error.message || 'Server error during user creation.' });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    res.status(200).json({ logs });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching audit logs.' });
  }
};
