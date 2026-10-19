import { Request, Response } from 'express';
import { Location, CampusLocationType, LocationStructureType } from '../models/Location';
import { Category } from '../models/Category';
import { Department } from '../models/Department';
import { Complaint } from '../models/Complaint';
import { Asset } from '../models/Asset';
import { Types } from 'mongoose';

/**
 * Helper to compute full breadcrumb path from parent hierarchy
 */
const buildFullPath = async (name: string, parentLocationId?: Types.ObjectId | string): Promise<string> => {
  if (!parentLocationId) {
    return name;
  }
  const parent = await Location.findById(parentLocationId);
  if (!parent) {
    return name;
  }
  return `${parent.fullPath || parent.name} > ${name}`;
};

/**
 * GET /api/v1/locations
 * Supports pagination, search, category filters, and backward-compatible building hierarchy
 */
export const getLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page,
      limit,
      search,
      locationType,
      structureType,
      zone,
      isActive,
      buildingName,
      all,
    } = req.query;

    const query: any = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else if (all !== 'true' && !req.query.includeInactive) {
      query.isActive = true;
    }

    if (locationType) {
      query.locationType = locationType;
    }

    if (structureType) {
      query.structureType = structureType;
    }

    if (zone) {
      query.zone = zone;
    }

    if (buildingName) {
      query.buildingName = buildingName;
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      query.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { buildingName: searchRegex },
        { roomNumber: searchRegex },
        { fullPath: searchRegex },
        { zone: searchRegex },
      ];
    }

    // Check if pagination is explicitly requested
    const isPaginated = page !== undefined || limit !== undefined;
    const pageNum = Math.max(1, parseInt(String(page || '1'), 10));
    const limitNum = Math.max(1, parseInt(String(limit || '50'), 10));
    const skip = (pageNum - 1) * limitNum;

    let locationsQuery = Location.find(query).sort({ buildingName: 1, floor: 1, roomNumber: 1, name: 1 });

    if (isPaginated && all !== 'true') {
      locationsQuery = locationsQuery.skip(skip).limit(limitNum);
    }

    const [locations, totalCount] = await Promise.all([
      locationsQuery.exec(),
      Location.countDocuments(query),
    ]);

    // Build backward-compatible hierarchy for building/floor/room dropdowns
    const hierarchy: Record<string, Record<string, string[]>> = {};

    locations.forEach((loc) => {
      const bName = loc.buildingName || loc.zone || 'Campus Facilities';
      const fName = loc.floor || 'Ground Level';
      const rName = loc.roomNumber || loc.name;

      if (!hierarchy[bName]) {
        hierarchy[bName] = {};
      }
      if (!hierarchy[bName][fName]) {
        hierarchy[bName][fName] = [];
      }
      if (!hierarchy[bName][fName].includes(rName)) {
        hierarchy[bName][fName].push(rName);
      }
    });

    res.status(200).json({
      success: true,
      locations,
      hierarchy,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch locations.' });
  }
};

/**
 * GET /api/v1/locations/hierarchy
 * Returns the entire location directory as a nested parent-child tree
 */
export const getLocationTree = async (req: Request, res: Response): Promise<void> => {
  try {
    const allLocations = await Location.find({ isActive: true })
      .sort({ locationType: 1, name: 1 })
      .lean();

    const locationMap = new Map<string, any>();
    const tree: any[] = [];

    // Index all items
    allLocations.forEach((loc) => {
      locationMap.set(loc._id.toString(), { ...loc, children: [] });
    });

    // Assemble tree
    allLocations.forEach((loc) => {
      const node = locationMap.get(loc._id.toString());
      if (loc.parentLocation && locationMap.has(loc.parentLocation.toString())) {
        const parentNode = locationMap.get(loc.parentLocation.toString());
        parentNode.children.push(node);
      } else {
        tree.push(node);
      }
    });

    res.status(200).json({ success: true, tree });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to build location tree.' });
  }
};

/**
 * GET /api/v1/locations/:id
 * Get single location with unresolved complaints count and parent details
 */
export const getLocationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid location ID format' });
      return;
    }

    const location = await Location.findById(id).populate('parentLocation', 'name code locationType fullPath');
    if (!location) {
      res.status(404).json({ success: false, message: 'Location not found' });
      return;
    }

    const [unresolvedComplaintsCount, linkedAssetsCount, children] = await Promise.all([
      Complaint.countDocuments({ location: id, status: { $nin: ['Resolved', 'Closed'] } }),
      Asset.countDocuments({ location: id }),
      Location.find({ parentLocation: id }),
    ]);

    res.status(200).json({
      success: true,
      location,
      metrics: {
        unresolvedComplaintsCount,
        linkedAssetsCount,
        subLocationCount: children.length,
      },
      children,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to retrieve location details.' });
  }
};

/**
 * POST /api/v1/locations
 * Creates a new campus location (supports both classic building/floor/room and campus-wide categories)
 */
export const createLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      code,
      name,
      locationType,
      structureType,
      parentLocation,
      zone,
      description,
      buildingName,
      floor,
      roomNumber,
      fullPath,
    } = req.body;

    // Handle backward compatibility where buildingName, floor, roomNumber are sent
    const resolvedName = name || (roomNumber ? `${buildingName || ''} - ${roomNumber}` : buildingName);
    if (!resolvedName && (!buildingName || !roomNumber)) {
      res.status(400).json({
        success: false,
        message: 'Location name or buildingName/floor/roomNumber are required.',
      });
      return;
    }

    // Auto-generate unique code if not explicitly passed
    let resolvedCode = code ? String(code).trim().toUpperCase() : '';
    if (!resolvedCode) {
      const typePrefix = (locationType || 'LOC').slice(0, 4).toUpperCase();
      const slug = resolvedName.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
      resolvedCode = `${typePrefix}-${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Check code uniqueness
    const existingWithCode = await Location.findOne({ code: resolvedCode });
    if (existingWithCode) {
      res.status(400).json({
        success: false,
        message: `A location with code '${resolvedCode}' already exists.`,
      });
      return;
    }

    // Verify parent location if provided
    let parentDoc = null;
    if (parentLocation) {
      if (!Types.ObjectId.isValid(parentLocation)) {
        res.status(400).json({ success: false, message: 'Invalid parentLocation ID.' });
        return;
      }
      parentDoc = await Location.findById(parentLocation);
      if (!parentDoc) {
        res.status(400).json({ success: false, message: 'Specified parentLocation does not exist.' });
        return;
      }
    }

    // Compute breadcrumb path
    const resolvedFullPath =
      fullPath ||
      (parentDoc
        ? `${parentDoc.fullPath || parentDoc.name} > ${resolvedName}`
        : buildingName && floor && roomNumber
        ? `${buildingName} > ${floor} > ${roomNumber}`
        : resolvedName);

    const newLocation = await Location.create({
      code: resolvedCode,
      name: resolvedName,
      locationType: (locationType as CampusLocationType) || 'ACADEMIC_BLOCK',
      structureType: (structureType as LocationStructureType) || (buildingName ? 'ROOM_BASED' : 'STANDALONE'),
      parentLocation: parentLocation ? new Types.ObjectId(parentLocation) : null,
      fullPath: resolvedFullPath,
      zone: zone || (buildingName ? buildingName : 'Main Campus'),
      description,
      buildingName,
      floor,
      roomNumber,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Campus location created successfully.',
      location: newLocation,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'A location with this identifier or building/room already exists.',
      });
      return;
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to create location.' });
  }
};

/**
 * PATCH /api/v1/locations/:id
 * Update an existing campus location
 */
export const updateLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid location ID format' });
      return;
    }

    const location = await Location.findById(id);
    if (!location) {
      res.status(404).json({ success: false, message: 'Location not found' });
      return;
    }

    const {
      name,
      code,
      locationType,
      structureType,
      parentLocation,
      zone,
      description,
      buildingName,
      floor,
      roomNumber,
      isActive,
    } = req.body;

    // Check code uniqueness if modified
    if (code && code.toUpperCase() !== location.code) {
      const existing = await Location.findOne({ code: code.toUpperCase(), _id: { $ne: id } });
      if (existing) {
        res.status(400).json({ success: false, message: `Code '${code}' is already assigned to another location.` });
        return;
      }
      location.code = code.toUpperCase();
    }

    // Cyclic parent check
    if (parentLocation !== undefined) {
      if (parentLocation) {
        if (String(parentLocation) === String(id)) {
          res.status(400).json({ success: false, message: 'A location cannot be its own parent.' });
          return;
        }
        if (!Types.ObjectId.isValid(parentLocation)) {
          res.status(400).json({ success: false, message: 'Invalid parentLocation ID.' });
          return;
        }
        const parentDoc = await Location.findById(parentLocation);
        if (!parentDoc) {
          res.status(400).json({ success: false, message: 'Parent location not found.' });
          return;
        }
        location.parentLocation = new Types.ObjectId(parentLocation);
      } else {
        location.parentLocation = undefined;
      }
    }

    if (name) location.name = name;
    if (locationType) location.locationType = locationType;
    if (structureType) location.structureType = structureType;
    if (zone) location.zone = zone;
    if (description !== undefined) location.description = description;
    if (buildingName !== undefined) location.buildingName = buildingName;
    if (floor !== undefined) location.floor = floor;
    if (roomNumber !== undefined) location.roomNumber = roomNumber;
    if (isActive !== undefined) location.isActive = Boolean(isActive);

    // Rebuild fullPath
    location.fullPath = await buildFullPath(location.name, location.parentLocation);

    await location.save();

    res.status(200).json({
      success: true,
      message: 'Location updated successfully.',
      location,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update location.' });
  }
};

/**
 * DELETE /api/v1/locations/:id
 * Enforces deletion protection: Rejects if active complaints, assets, or sub-locations exist
 */
export const deleteLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid location ID format' });
      return;
    }

    const location = await Location.findById(id);
    if (!location) {
      res.status(404).json({ success: false, message: 'Location not found' });
      return;
    }

    // Deletion Protection Rule 1: Check child locations
    const childLocationsCount = await Location.countDocuments({ parentLocation: id });
    if (childLocationsCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete location: ${childLocationsCount} child sub-location(s) depend on this location. Reassign or delete child locations first.`,
      });
      return;
    }

    // Deletion Protection Rule 2: Check active complaints
    const activeComplaintsCount = await Complaint.countDocuments({
      location: id,
      status: { $nin: ['Resolved', 'Closed'] },
    });
    if (activeComplaintsCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete location: ${activeComplaintsCount} active, unresolved complaint(s) are linked to this location. Resolve or reassign complaints first.`,
      });
      return;
    }

    // Deletion Protection Rule 3: Check linked assets
    const linkedAssetsCount = await Asset.countDocuments({ location: id });
    if (linkedAssetsCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete location: ${linkedAssetsCount} campus equipment asset(s) are registered at this location. Reassign assets before deletion.`,
      });
      return;
    }

    await Location.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Location '${location.name}' (${location.code}) successfully removed.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete location.' });
  }
};

/**
 * GET /api/v1/locations/:id/unresolved-complaints
 * Returns active tickets for a location
 */
export const getUnresolvedComplaintsByLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid location ID format' });
      return;
    }

    const complaints = await Complaint.find({
      location: id,
      status: { $nin: ['Closed', 'Resolved'] },
    }).sort({ priority: -1, createdAt: -1 });

    res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch unresolved complaints.' });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({ success: true, categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch categories.' });
  }
};

export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.status(200).json({ success: true, departments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch departments.' });
  }
};
