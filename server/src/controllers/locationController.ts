import { Request, Response } from 'express';
import { Location } from '../models/Location';
import { Category } from '../models/Category';
import { Department } from '../models/Department';

export const getLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    const locations = await Location.find({ isActive: true }).sort({ buildingName: 1, floor: 1, roomNumber: 1 });
    
    // Structure dynamic building hierarchy for cascading dropdowns
    const hierarchy: Record<string, Record<string, string[]>> = {};

    locations.forEach((loc) => {
      if (!hierarchy[loc.buildingName]) {
        hierarchy[loc.buildingName] = {};
      }
      if (!hierarchy[loc.buildingName][loc.floor]) {
        hierarchy[loc.buildingName][loc.floor] = [];
      }
      if (!hierarchy[loc.buildingName][loc.floor].includes(loc.roomNumber)) {
        hierarchy[loc.buildingName][loc.floor].push(loc.roomNumber);
      }
    });

    res.status(200).json({ locations, hierarchy });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch locations.' });
  }
};

export const createLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { buildingName, floor, roomNumber } = req.body;
    if (!buildingName || !floor || !roomNumber) {
      res.status(400).json({ message: 'buildingName, floor, and roomNumber are required.' });
      return;
    }

    const newLoc = await Location.create({ buildingName, floor, roomNumber });
    res.status(201).json({ message: 'Location added successfully', location: newLoc });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create location.' });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({ categories });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch categories.' });
  }
};

export const getDepartments = async (req: Request, res: Response): Promise<void> => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.status(200).json({ departments });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch departments.' });
  }
};
