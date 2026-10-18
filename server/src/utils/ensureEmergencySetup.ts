import { Category } from '../models/Category';
import { Department } from '../models/Department';

export const ensureEmergencySetup = async (): Promise<void> => {
  try {
    // 1. Ensure Department exists
    const existingDept = await Department.findOne({
      $or: [
        { code: 'SEC-WSC' },
        { name: 'Security & Women Safety Cell' },
      ],
    });

    if (!existingDept) {
      await Department.create({
        name: 'Security & Women Safety Cell',
        code: 'SEC-WSC',
        headName: 'Dr. K. Meenakshi (Women Safety Coordinator & HOD)',
        contactPhone: '+91 99529112177',
      });
      console.log('[Setup] Created department: Security & Women Safety Cell');
    }

    // 2. Ensure Category exists
    const existingCat = await Category.findOne({
      $or: [
        { name: 'Women Safety & SOS' },
        { name: /women safety/i },
      ],
    });

    if (!existingCat) {
      await Category.create({
        name: 'Women Safety & SOS',
        description: 'Harassment, stalking, distress, or immediate female student safety assistance',
        icon: 'ShieldAlert',
        defaultDepartment: 'Security & Women Safety Cell',
        defaultSLAHours: 1,
      });
      console.log('[Setup] Created category: Women Safety & SOS (1-hour SLA)');
    }
  } catch (error) {
    console.error('[Setup] Error ensuring emergency categories and departments:', error);
  }
};
