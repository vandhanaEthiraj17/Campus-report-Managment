import { Response } from 'express';
import { Complaint } from '../models/Complaint';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getAnalyticsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalComplaints = await Complaint.countDocuments();
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
    const { userId } = req.params;
    const { role, department } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (role) user.role = role;
    if (department !== undefined) user.department = department;

    await user.save();
    res.status(200).json({ message: 'User profile updated successfully.', user });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error updating user role.' });
  }
};
