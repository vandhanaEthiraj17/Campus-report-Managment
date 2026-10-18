import { Asset } from '../models/Asset';
import { MaintenanceRecord } from '../models/MaintenanceRecord';
import { Location } from '../models/Location';
import { User } from '../models/User';

export const ensureAssetSetup = async (): Promise<void> => {
  try {
    const assetCount = await Asset.countDocuments();
    if (assetCount > 0) {
      return;
    }

    console.log('[Setup] No assets found. Seeding initial campus assets...');

    const staffMember = await User.findOne({ role: 'STAFF' });
    const now = new Date();

    const sampleAssets = [
      {
        assetCode: 'AST-MB-101-01',
        assetName: 'Epson EB-2250U Full HD Laser Projector',
        assetType: 'PROJECTOR',
        category: 'Projector & AV Issues',
        description: 'Ceiling-mounted 5000 lumens classroom projector with HDMI & wireless mirroring.',
        building: 'Main Block',
        floor: '1st Floor',
        room: 'Room 101',
        manufacturer: 'Epson',
        modelNumber: 'EB-2250U',
        serialNumber: 'EP-99283-X1',
        installationDate: new Date('2024-01-15'),
        warrantyExpiryDate: new Date('2027-01-15'),
        purchaseDate: new Date('2024-01-10'),
        status: 'ACTIVE',
        condition: 'EXCELLENT',
        maintenanceFrequencyDays: 90,
        lastMaintenanceDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
        nextMaintenanceDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
        assignedDepartment: 'IT & Multimedia Support',
        complaintCount: 0,
      },
      {
        assetCode: 'AST-MB-LAB1-02',
        assetName: 'Cisco Catalyst 3850 Gigabit Switch & Core AP',
        assetType: 'NETWORK_ROUTER',
        category: 'WiFi & Network',
        description: 'Rack-mounted 48-port PoE core switch servicing Computer Lab 1 & network backbone.',
        building: 'Main Block',
        floor: '1st Floor',
        room: 'Computer Lab 1',
        manufacturer: 'Cisco',
        modelNumber: 'WS-C3850-48P',
        serialNumber: 'CSCO-88192-A',
        installationDate: new Date('2023-06-20'),
        warrantyExpiryDate: new Date('2028-06-20'),
        purchaseDate: new Date('2023-06-01'),
        status: 'ACTIVE',
        condition: 'GOOD',
        maintenanceFrequencyDays: 120,
        lastMaintenanceDate: new Date(now.getTime() - 110 * 24 * 60 * 60 * 1000),
        nextMaintenanceDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // Due soon
        assignedDepartment: 'IT & Multimedia Support',
        complaintCount: 1,
      },
      {
        assetCode: 'AST-MB-HALL-03',
        assetName: 'Daikin 5.0 TR Ductable Inverter AC Unit',
        assetType: 'AIR_CONDITIONER',
        category: 'Electrical Hazards',
        description: 'Heavy cooling inverter HVAC system installed in Seminar Hall A ceiling plenum.',
        building: 'Main Block',
        floor: '2nd Floor',
        room: 'Seminar Hall A',
        manufacturer: 'Daikin',
        modelNumber: 'FDA50AV16',
        serialNumber: 'DKN-77312-Z',
        installationDate: new Date('2022-03-10'),
        warrantyExpiryDate: new Date('2025-03-10'), // Expired
        purchaseDate: new Date('2022-02-20'),
        status: 'ACTIVE',
        condition: 'FAIR',
        maintenanceFrequencyDays: 60,
        lastMaintenanceDate: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000),
        nextMaintenanceDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // Overdue!
        assignedDepartment: 'HVAC Services',
        complaintCount: 3,
      },
      {
        assetCode: 'AST-MB-AUD-04',
        assetName: 'JBL Pro VRX932 Line Array PA & Sound Console',
        assetType: 'LAB_EQUIPMENT',
        category: 'Projector & AV Issues',
        description: 'Main auditorium sound reinforcement system, 32-channel digital mixer & speakers.',
        building: 'Main Block',
        floor: '3rd Floor',
        room: 'Auditorium',
        manufacturer: 'JBL Professional',
        modelNumber: 'VRX932LA-1',
        serialNumber: 'JBL-AUD-4491',
        installationDate: new Date('2023-08-01'),
        warrantyExpiryDate: new Date('2026-08-01'),
        status: 'ACTIVE',
        condition: 'GOOD',
        maintenanceFrequencyDays: 90,
        lastMaintenanceDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        nextMaintenanceDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        assignedDepartment: 'IT & Multimedia Support',
        complaintCount: 1,
      },
      {
        assetCode: 'AST-MBA-108-05',
        assetName: 'Blue Star 80L Commercial RO + UV Water Cooler',
        assetType: 'WATER_PURIFIER',
        category: 'Water Leakage',
        description: 'Dual-tap commercial drinking water dispenser with filtration cartridge.',
        building: 'MBA Block',
        floor: '1st Floor',
        room: 'Room 108',
        manufacturer: 'Blue Star',
        modelNumber: 'SWC-80-RO',
        serialNumber: 'BST-55219-W',
        installationDate: new Date('2021-11-05'),
        warrantyExpiryDate: new Date('2024-11-05'), // Expired
        status: 'ACTIVE',
        condition: 'FAIR',
        maintenanceFrequencyDays: 45,
        lastMaintenanceDate: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000),
        nextMaintenanceDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // Overdue
        assignedDepartment: 'Plumbing Unit',
        complaintCount: 2,
      },
      {
        assetCode: 'AST-CIV-MECH-06',
        assetName: 'Ace Micromatic CNC Industrial Lathe Center',
        assetType: 'LAB_EQUIPMENT',
        category: 'Safety Hazards',
        description: 'Precision machining workstation for mechanical engineering workshop laboratory.',
        building: 'Civil Block',
        floor: '1st Floor',
        room: 'Mechanical Workshop',
        manufacturer: 'Ace Micromatic',
        modelNumber: 'LT-20-CLASSIC',
        serialNumber: 'ACE-2022-817',
        installationDate: new Date('2022-09-15'),
        warrantyExpiryDate: new Date('2027-09-15'),
        status: 'ACTIVE',
        condition: 'GOOD',
        maintenanceFrequencyDays: 90,
        lastMaintenanceDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        nextMaintenanceDate: new Date(now.getTime() + 70 * 24 * 60 * 60 * 1000),
        assignedDepartment: 'Electrical Maintenance',
        complaintCount: 0,
      },
    ];

    for (const item of sampleAssets) {
      let loc = await Location.findOne({
        buildingName: item.building,
        floor: item.floor,
        roomNumber: item.room,
      });

      if (!loc) {
        loc = await Location.create({
          buildingName: item.building,
          floor: item.floor,
          roomNumber: item.room,
        });
      }

      const createdAsset = await Asset.create({
        ...item,
        location: loc._id,
        assignedStaff: staffMember?._id,
      });

      // Create a completed historical maintenance record for the Daikin AC
      if (item.assetCode === 'AST-MB-HALL-03') {
        await MaintenanceRecord.create({
          recordId: 'MNT-2024-9102',
          asset: createdAsset._id,
          assetCode: createdAsset.assetCode,
          assetName: createdAsset.assetName,
          maintenanceType: 'PREVENTIVE',
          scheduledDate: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000),
          completedDate: new Date(now.getTime() - 74 * 24 * 60 * 60 * 1000),
          assignedStaff: staffMember?._id,
          assignedStaffName: staffMember?.name || 'Er. Staff Technician',
          assignedDepartment: 'HVAC Services',
          workDescription: 'Periodic filter cleaning, refrigerant gas pressure check (65 PSI), and compressor amp test.',
          partsReplaced: 'Air Filter Mesh, 2x Capacitor 45uF',
          cost: 1850,
          conditionAfter: 'GOOD',
          status: 'COMPLETED',
          reminderSent: true,
          notes: 'Unit running within standard temperature tolerances.',
        });
      }
    }

    console.log(`[Setup] Successfully seeded ${sampleAssets.length} campus assets.`);
  } catch (error) {
    console.error('[Setup] Error seeding initial assets:', error);
  }
};
