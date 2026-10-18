import { Response } from 'express';
import { Asset, IAsset } from '../models/Asset';
import { MaintenanceRecord } from '../models/MaintenanceRecord';
import { Complaint } from '../models/Complaint';
import { Location } from '../models/Location';
import { AuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * Get assets with search, filters, and maintenance/warranty flags
 */
export const getAssets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      search,
      building,
      floor,
      room,
      category,
      assetType,
      status,
      condition,
      maintenanceNeeded,
      warrantyExpired,
      repeatedComplaints,
    } = req.query;

    const query: any = {};

    if (building) query.building = { $regex: String(building).trim(), $options: 'i' };
    if (floor) query.floor = { $regex: String(floor).trim(), $options: 'i' };
    if (room) query.room = { $regex: String(room).trim(), $options: 'i' };
    if (category) query.category = { $regex: String(category).trim(), $options: 'i' };
    if (assetType) query.assetType = assetType;
    if (status) query.status = status;
    if (condition) query.condition = condition;

    if (maintenanceNeeded === 'true') {
      const now = new Date();
      query.status = { $ne: 'DECOMMISSIONED' };
      query.$or = [
        { nextMaintenanceDate: { $lte: now } },
        { condition: { $in: ['POOR', 'CRITICAL'] } },
        { status: 'IN_REPAIR' },
      ];
    }

    if (warrantyExpired === 'true') {
      query.warrantyExpiryDate = { $lte: new Date() };
    }

    if (repeatedComplaints === 'true') {
      query.complaintCount = { $gte: 2 };
    }

    if (search) {
      const searchRegex = { $regex: String(search).trim(), $options: 'i' };
      const searchConditions = [
        { assetCode: searchRegex },
        { assetName: searchRegex },
        { manufacturer: searchRegex },
        { modelNumber: searchRegex },
        { serialNumber: searchRegex },
        { room: searchRegex },
        { building: searchRegex },
      ];

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions },
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const assets = await Asset.find(query)
      .populate('location', 'buildingName floor roomNumber')
      .populate('assignedStaff', 'name email phone')
      .sort({ updatedAt: -1 });

    res.status(200).json({ assets, count: assets.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching campus assets.' });
  }
};

/**
 * Get single asset by ID with linked complaints and maintenance history
 */
export const getAssetById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const asset = await Asset.findById(id)
      .populate('location')
      .populate('assignedStaff', 'name email phone department')
      .populate('createdBy', 'name email role');

    if (!asset) {
      res.status(404).json({ message: 'Asset not found.' });
      return;
    }

    // Fetch related complaints
    const complaints = await Complaint.find({ asset: asset._id })
      .select('ticketId title priority status createdAt resolvedAt beforeImages locationDetails')
      .sort({ createdAt: -1 });

    // Fetch maintenance history
    const maintenanceHistory = await MaintenanceRecord.find({ asset: asset._id })
      .populate('assignedStaff', 'name email phone department')
      .sort({ scheduledDate: -1 });

    res.status(200).json({
      asset,
      complaints,
      maintenanceHistory,
      complaintHistoryCount: complaints.length,
      maintenanceRecordsCount: maintenanceHistory.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error retrieving asset details.' });
  }
};

/**
 * Create a new campus asset (Admin only)
 */
export const createAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      assetCode,
      assetName,
      assetType,
      category,
      description,
      building,
      floor,
      room,
      manufacturer,
      modelNumber,
      serialNumber,
      installationDate,
      warrantyExpiryDate,
      purchaseDate,
      purchaseCost,
      expectedLifespanYears,
      status,
      condition,
      maintenanceFrequencyDays,
      lastMaintenanceDate,
      assignedDepartment,
      assignedStaff,
    } = req.body;

    if (!assetName || !category || !building || !floor || !room) {
      res.status(400).json({
        message: 'assetName, category, building, floor, and room are required fields.',
      });
      return;
    }

    if (purchaseCost !== undefined && Number(purchaseCost) < 0) {
      res.status(400).json({ message: 'purchaseCost must be a non-negative number.' });
      return;
    }

    if (expectedLifespanYears !== undefined && Number(expectedLifespanYears) < 1) {
      res.status(400).json({ message: 'expectedLifespanYears must be at least 1 year.' });
      return;
    }

    // Determine or generate unique assetCode
    let finalCode = (assetCode || '').trim().toUpperCase();
    if (!finalCode) {
      const bCode = building.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const rNum = room.replace(/[^A-Z0-9]/g, '').toUpperCase();
      const rand = Math.floor(1000 + Math.random() * 9000);
      finalCode = `AST-${bCode || 'CAMP'}-${rNum || 'GEN'}-${rand}`;
    }

    // Validate code uniqueness
    const existingCode = await Asset.findOne({ assetCode: finalCode });
    if (existingCode) {
      res.status(400).json({ message: `Asset code '${finalCode}' already exists.` });
      return;
    }

    // Find or create associated location
    let locationDoc = await Location.findOne({
      buildingName: building.trim(),
      floor: floor.trim(),
      roomNumber: room.trim(),
    });
    if (!locationDoc) {
      locationDoc = await Location.create({
        buildingName: building.trim(),
        floor: floor.trim(),
        roomNumber: room.trim(),
      });
    }

    // Compute nextMaintenanceDate based on frequency
    const freq = Number(maintenanceFrequencyDays) || 90;
    const baseDate = lastMaintenanceDate ? new Date(lastMaintenanceDate) : (installationDate ? new Date(installationDate) : new Date());
    const nextMaintenanceDate = new Date(baseDate.getTime() + freq * 24 * 60 * 60 * 1000);

    const newAsset = await Asset.create({
      assetCode: finalCode,
      assetName: assetName.trim(),
      assetType: assetType || 'OTHER',
      category: category.trim(),
      description: description ? description.trim() : undefined,
      building: building.trim(),
      floor: floor.trim(),
      room: room.trim(),
      location: locationDoc._id,
      manufacturer: manufacturer ? manufacturer.trim() : undefined,
      modelNumber: modelNumber ? modelNumber.trim() : undefined,
      serialNumber: serialNumber ? serialNumber.trim() : undefined,
      installationDate: installationDate ? new Date(installationDate) : new Date(),
      warrantyExpiryDate: warrantyExpiryDate ? new Date(warrantyExpiryDate) : undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      purchaseCost: purchaseCost !== undefined ? Math.max(0, Number(purchaseCost)) : undefined,
      expectedLifespanYears: expectedLifespanYears !== undefined ? Math.max(1, Number(expectedLifespanYears)) : undefined,
      totalMaintenanceCost: 0,
      status: status || 'ACTIVE',
      condition: condition || 'GOOD',
      maintenanceFrequencyDays: freq,
      lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : undefined,
      nextMaintenanceDate,
      assignedDepartment: assignedDepartment ? assignedDepartment.trim() : undefined,
      assignedStaff: assignedStaff || undefined,
      complaintCount: 0,
      createdBy: req.user?.userId,
      updatedBy: req.user?.userId,
    });

    // Audit log
    if (req.user) {
      await AuditLog.create({
        action: 'ASSET_CREATED',
        performedBy: req.user.userId,
        performedByName: req.user.name,
        details: {
          assetId: newAsset._id,
          assetCode: newAsset.assetCode,
          assetName: newAsset.assetName,
          building: newAsset.building,
          room: newAsset.room,
        },
      });
    }

    res.status(201).json({
      message: 'Campus asset registered successfully.',
      asset: newAsset,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'An asset with this asset code or unique constraint already exists.' });
      return;
    }
    res.status(500).json({ message: error.message || 'Error creating campus asset.' });
  }
};

/**
 * Update campus asset details (Admin only)
 */
export const updateAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id);

    if (!asset) {
      res.status(404).json({ message: 'Asset not found.' });
      return;
    }

    const {
      assetCode,
      assetName,
      assetType,
      category,
      description,
      building,
      floor,
      room,
      manufacturer,
      modelNumber,
      serialNumber,
      installationDate,
      warrantyExpiryDate,
      purchaseDate,
      purchaseCost,
      expectedLifespanYears,
      status,
      condition,
      maintenanceFrequencyDays,
      lastMaintenanceDate,
      nextMaintenanceDate,
      assignedDepartment,
      assignedStaff,
    } = req.body;

    if (purchaseCost !== undefined && Number(purchaseCost) < 0) {
      res.status(400).json({ message: 'purchaseCost must be a non-negative number.' });
      return;
    }

    if (expectedLifespanYears !== undefined && Number(expectedLifespanYears) < 1) {
      res.status(400).json({ message: 'expectedLifespanYears must be at least 1 year.' });
      return;
    }

    // Check code collision if code is being changed
    if (assetCode && assetCode.trim().toUpperCase() !== asset.assetCode) {
      const codeCheck = await Asset.findOne({
        assetCode: assetCode.trim().toUpperCase(),
        _id: { $ne: asset._id },
      });
      if (codeCheck) {
        res.status(400).json({ message: `Asset code '${assetCode}' is already in use by another asset.` });
        return;
      }
      asset.assetCode = assetCode.trim().toUpperCase();
    }

    if (assetName) asset.assetName = assetName.trim();
    if (assetType) asset.assetType = assetType;
    if (category) asset.category = category.trim();
    if (description !== undefined) asset.description = description ? description.trim() : '';
    if (building) asset.building = building.trim();
    if (floor) asset.floor = floor.trim();
    if (room) asset.room = room.trim();
    if (manufacturer !== undefined) asset.manufacturer = manufacturer;
    if (modelNumber !== undefined) asset.modelNumber = modelNumber;
    if (serialNumber !== undefined) asset.serialNumber = serialNumber;
    if (installationDate) asset.installationDate = new Date(installationDate);
    if (warrantyExpiryDate !== undefined) asset.warrantyExpiryDate = warrantyExpiryDate ? new Date(warrantyExpiryDate) : undefined;
    if (purchaseDate !== undefined) asset.purchaseDate = purchaseDate ? new Date(purchaseDate) : undefined;
    if (purchaseCost !== undefined) asset.purchaseCost = Math.max(0, Number(purchaseCost));
    if (expectedLifespanYears !== undefined) asset.expectedLifespanYears = Math.max(1, Number(expectedLifespanYears));
    if (status) asset.status = status;
    if (condition) asset.condition = condition;
    if (assignedDepartment !== undefined) asset.assignedDepartment = assignedDepartment;
    if (assignedStaff !== undefined) asset.assignedStaff = assignedStaff || undefined;

    // Recalculate next maintenance date if frequency or last maintenance changed
    if (maintenanceFrequencyDays !== undefined) {
      asset.maintenanceFrequencyDays = Number(maintenanceFrequencyDays);
    }

    if (lastMaintenanceDate !== undefined) {
      asset.lastMaintenanceDate = lastMaintenanceDate ? new Date(lastMaintenanceDate) : undefined;
    }

    if (nextMaintenanceDate !== undefined) {
      asset.nextMaintenanceDate = nextMaintenanceDate ? new Date(nextMaintenanceDate) : undefined;
    } else if (maintenanceFrequencyDays !== undefined || lastMaintenanceDate !== undefined) {
      const base = asset.lastMaintenanceDate || new Date();
      asset.nextMaintenanceDate = new Date(base.getTime() + asset.maintenanceFrequencyDays * 24 * 60 * 60 * 1000);
    }

    asset.updatedBy = req.user?.userId;
    await asset.save();

    // Audit log
    if (req.user) {
      await AuditLog.create({
        action: 'ASSET_UPDATED',
        performedBy: req.user.userId,
        performedByName: req.user.name,
        details: {
          assetId: asset._id,
          assetCode: asset.assetCode,
          updatedFields: Object.keys(req.body),
        },
      });
    }

    res.status(200).json({ message: 'Asset updated successfully.', asset });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error updating asset.' });
  }
};

/**
 * Decommission or delete campus asset (Admin only)
 */
export const deleteAsset = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const asset = await Asset.findById(id);

    if (!asset) {
      res.status(404).json({ message: 'Asset not found.' });
      return;
    }

    // Set to DECOMMISSIONED (soft delete to preserve audit and complaint history)
    asset.status = 'DECOMMISSIONED';
    asset.updatedBy = req.user?.userId;
    await asset.save();

    if (req.user) {
      await AuditLog.create({
        action: 'ASSET_DECOMMISSIONED',
        performedBy: req.user.userId,
        performedByName: req.user.name,
        details: { assetId: asset._id, assetCode: asset.assetCode },
      });
    }

    res.status(200).json({ message: 'Asset decommissioned successfully.', asset });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error deleting asset.' });
  }
};

/**
 * Database-driven Asset & Preventive Maintenance Analytics
 */
export const getAssetAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();

    // Aggregate key counts using real MongoDB queries
    const [
      totalAssets,
      activeAssets,
      maintenanceNeeded,
      overdueTasks,
      repeatedComplaints,
      underWarranty,
      expiredWarranty,
      totalMaintenanceRecords,
      completedMaintenanceRecords,
    ] = await Promise.all([
      Asset.countDocuments({ status: { $ne: 'DECOMMISSIONED' } }),
      Asset.countDocuments({ status: 'ACTIVE' }),
      Asset.countDocuments({
        status: { $ne: 'DECOMMISSIONED' },
        $or: [
          { nextMaintenanceDate: { $lte: now } },
          { condition: { $in: ['POOR', 'CRITICAL'] } },
          { status: 'IN_REPAIR' },
        ],
      }),
      MaintenanceRecord.countDocuments({
        status: { $in: ['OVERDUE', 'SCHEDULED'] },
        scheduledDate: { $lt: now },
      }),
      Asset.countDocuments({ complaintCount: { $gte: 2 } }),
      Asset.countDocuments({
        warrantyExpiryDate: { $gt: now },
        status: { $ne: 'DECOMMISSIONED' },
      }),
      Asset.countDocuments({
        warrantyExpiryDate: { $lte: now },
        status: { $ne: 'DECOMMISSIONED' },
      }),
      MaintenanceRecord.countDocuments(),
      MaintenanceRecord.countDocuments({ status: 'COMPLETED' }),
    ]);

    const maintenanceCompletionRate = totalMaintenanceRecords > 0
      ? Math.round((completedMaintenanceRecords / totalMaintenanceRecords) * 100)
      : 100;

    // Aggregation 1: Most reported asset categories
    const categoryDemand = await Asset.aggregate([
      { $match: { status: { $ne: 'DECOMMISSIONED' } } },
      {
        $group: {
          _id: '$category',
          totalAssets: { $sum: 1 },
          totalComplaints: { $sum: '$complaintCount' },
        },
      },
      { $sort: { totalComplaints: -1 } },
      { $limit: 6 },
      {
        $project: {
          category: '$_id',
          totalAssets: 1,
          totalComplaints: 1,
          _id: 0,
        },
      },
    ]);

    // Aggregation 2: Buildings with highest maintenance demand
    const buildingDemand = await Asset.aggregate([
      { $match: { status: { $ne: 'DECOMMISSIONED' } } },
      {
        $group: {
          _id: '$building',
          assetCount: { $sum: 1 },
          totalComplaints: { $sum: '$complaintCount' },
          maintenanceDue: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $lte: ['$nextMaintenanceDate', now] },
                    { $in: ['$condition', ['POOR', 'CRITICAL']] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { totalComplaints: -1, maintenanceDue: -1 } },
      { $limit: 6 },
      {
        $project: {
          building: '$_id',
          assetCount: 1,
          totalComplaints: 1,
          maintenanceDue: 1,
          _id: 0,
        },
      },
    ]);

    // Aggregation 3: Asset condition breakdown
    const conditionBreakdown = await Asset.aggregate([
      { $match: { status: { $ne: 'DECOMMISSIONED' } } },
      {
        $group: {
          _id: '$condition',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      totalAssets,
      activeAssets,
      maintenanceNeeded,
      overdueTasks,
      repeatedComplaints,
      underWarranty,
      expiredWarranty,
      totalMaintenanceRecords,
      completedMaintenanceRecords,
      maintenanceCompletionRate,
      categoryDemand,
      buildingDemand,
      conditionBreakdown,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error computing asset analytics.' });
  }
};
