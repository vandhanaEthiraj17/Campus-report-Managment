import { Location, CampusLocationType, LocationStructureType } from '../models/Location';
import { Category } from '../models/Category';
import { Department } from '../models/Department';

interface ISeedLocationDef {
  code: string;
  name: string;
  locationType: CampusLocationType;
  structureType: LocationStructureType;
  zone: string;
  fullPath: string;
  buildingName?: string;
  floor?: string;
  roomNumber?: string;
  description?: string;
}

const campusLocationDefs: ISeedLocationDef[] = [
  // 1. Main gate and security checkpoints
  {
    code: 'SEC-GATE-01',
    name: 'Main Campus Entrance & Security Post 1',
    locationType: 'SECURITY_CHECKPOINT',
    structureType: 'STANDALONE',
    zone: 'Entrance Perimeter',
    fullPath: 'Main Campus Gate > North Security Checkpoint',
    description: 'Vehicle and pedestrian security gate at primary campus access road.',
  },
  {
    code: 'SEC-GATE-02',
    name: 'Hostel Archway Security Post 2',
    locationType: 'SECURITY_CHECKPOINT',
    structureType: 'STANDALONE',
    zone: 'Hostel Zone',
    fullPath: 'Residential Sector > Security Kiosk 2',
    description: 'Night watch and student entry security check.',
  },

  // 2. Academic blocks and classrooms (existing + new)
  {
    code: 'ACAD-MAIN-101',
    name: 'Room 101 Lecture Hall',
    locationType: 'ACADEMIC_BLOCK',
    structureType: 'ROOM_BASED',
    zone: 'Academic Quadrant',
    buildingName: 'Main Block',
    floor: '1st Floor',
    roomNumber: 'Room 101',
    fullPath: 'Main Block > 1st Floor > Room 101',
    description: 'Smart classroom equipped with digital projector.',
  },
  {
    code: 'ACAD-MAIN-204',
    name: 'Room 204 Seminar Classroom',
    locationType: 'ACADEMIC_BLOCK',
    structureType: 'ROOM_BASED',
    zone: 'Academic Quadrant',
    buildingName: 'Main Block',
    floor: '2nd Floor',
    roomNumber: 'Room 204',
    fullPath: 'Main Block > 2nd Floor > Room 204',
    description: 'Tiered seating lecture classroom.',
  },

  // 3. Laboratories and research facilities
  {
    code: 'LAB-COMP-01',
    name: 'Central Computer Center - Lab 1',
    locationType: 'LABORATORY',
    structureType: 'ROOM_BASED',
    zone: 'IT Wing',
    buildingName: 'Main Block',
    floor: '1st Floor',
    roomNumber: 'Computer Lab 1',
    fullPath: 'Main Block > 1st Floor > Computer Lab 1',
    description: '60-workstation Linux and cloud computing laboratory.',
  },
  {
    code: 'LAB-MECH-WS',
    name: 'Mechanical & Civil Workshop Unit',
    locationType: 'LABORATORY',
    structureType: 'ROOM_BASED',
    zone: 'Engineering Workshop',
    buildingName: 'Civil Block',
    floor: '1st Floor',
    roomNumber: 'Mechanical Workshop',
    fullPath: 'Civil Block > 1st Floor > Mechanical Workshop',
    description: 'Heavy machinery, lathe, and welding training arena.',
  },

  // 4. Faculty and administrative offices
  {
    code: 'OFF-DEAN-01',
    name: 'Dean & Principal Executive Secretariat',
    locationType: 'OFFICE',
    structureType: 'ROOM_BASED',
    zone: 'Administrative Portico',
    buildingName: 'Main Block',
    floor: '1st Floor',
    roomNumber: 'Admin Wing Suite A',
    fullPath: 'Main Block > 1st Floor > Admin Wing Suite A',
    description: 'College administrative leadership and student grievances chamber.',
  },

  // 5. Hostels and residential blocks
  {
    code: 'HOSTEL-A-F1',
    name: 'Boys Hostel Block A - Wing 1',
    locationType: 'HOSTEL',
    structureType: 'ZONE_BASED',
    zone: 'Hostel Zone',
    buildingName: 'Hostel Block A',
    floor: '1st Floor',
    roomNumber: 'Wing 1 Corridors',
    fullPath: 'Hostel Block A > 1st Floor > Wing 1 Corridors',
    description: 'Student residential block housing undergraduate students.',
  },
  {
    code: 'HOSTEL-B-F1',
    name: 'Girls Hostel Block B - Wing 1',
    locationType: 'HOSTEL',
    structureType: 'ZONE_BASED',
    zone: 'Hostel Zone',
    buildingName: 'Hostel Block B',
    floor: '1st Floor',
    roomNumber: 'Girls Wing Corridors',
    fullPath: 'Hostel Block B > 1st Floor > Girls Wing Corridors',
    description: 'Protected female student residential block with 24/7 warden station.',
  },

  // 6. Canteens, cafeterias, and food courts
  {
    code: 'CANT-MAIN-01',
    name: 'Campus Dining Hall & Cafeteria',
    locationType: 'CANTEEN',
    structureType: 'ROOM_BASED',
    zone: 'Student Amenities',
    buildingName: 'Canteen Block',
    floor: 'Ground Floor',
    roomNumber: 'Main Dining Hall',
    fullPath: 'Canteen Block > Ground Floor > Main Dining Hall',
    description: 'Central student and staff food court.',
  },
  {
    code: 'CANT-KITCHEN-01',
    name: 'Canteen Commercial Kitchen & Pantry',
    locationType: 'CANTEEN',
    structureType: 'STANDALONE',
    zone: 'Student Amenities',
    buildingName: 'Canteen Block',
    floor: 'Ground Floor',
    roomNumber: 'Kitchen & Prep Area',
    fullPath: 'Canteen Block > Kitchen & Prep Area',
    description: 'Food preparation, industrial stoves, and refrigeration area.',
  },

  // 7. Library and auditorium
  {
    code: 'LIB-DIGITAL-01',
    name: 'Central Library & Digital Reading Room',
    locationType: 'LIBRARY_AUDITORIUM',
    structureType: 'ROOM_BASED',
    zone: 'Academic Quadrant',
    buildingName: 'Library Block',
    floor: '1st Floor',
    roomNumber: 'Digital Reading Room',
    fullPath: 'Library Block > 1st Floor > Digital Reading Room',
    description: 'Quiet study area, journal archives, and high-speed research terminals.',
  },
  {
    code: 'AUD-MAIN-01',
    name: 'Main Institutional Auditorium',
    locationType: 'LIBRARY_AUDITORIUM',
    structureType: 'ROOM_BASED',
    zone: 'Academic Quadrant',
    buildingName: 'Main Block',
    floor: '3rd Floor',
    roomNumber: 'Auditorium Hall',
    fullPath: 'Main Block > 3rd Floor > Auditorium Hall',
    description: '1,200-seat multi-purpose university event center.',
  },

  // 8. Car parking and two-wheeler parking
  {
    code: 'PARK-TWO-01',
    name: 'Student Two-Wheeler Parking Lot A',
    locationType: 'PARKING',
    structureType: 'ZONE_BASED',
    zone: 'West Perimeter',
    fullPath: 'West Gate > Two-Wheeler Shed 1',
    description: 'Covered canopy parking area for student motorbikes and cycles.',
  },
  {
    code: 'PARK-FOUR-01',
    name: 'Faculty & Visitor Car Park B',
    locationType: 'PARKING',
    structureType: 'ZONE_BASED',
    zone: 'Admin Perimeter',
    fullPath: 'Admin Block Portico > Staff Parking Bay',
    description: 'Designated vehicular bays with EV charging stations.',
  },

  // 9. College buses, transport facilities, and bus stops
  {
    code: 'TRANS-BUS-04',
    name: 'College Bus Route 4 (KA-01-F-4402)',
    locationType: 'TRANSPORT',
    structureType: 'VEHICLE_BASED',
    zone: 'Transport Depot',
    fullPath: 'Transport Fleet > College Bus #04',
    description: 'Daily commuter bus operating on Highway South Corridor.',
  },
  {
    code: 'TRANS-SHELTER-01',
    name: 'Main Campus Transit Bus Shelter',
    locationType: 'TRANSPORT',
    structureType: 'STANDALONE',
    zone: 'Entrance Perimeter',
    fullPath: 'Main Gate > Passenger Waiting Shelter',
    description: 'Bus boarding platform equipped with schedules and lighting.',
  },

  // 10. Roads, pathways, subways, and pedestrian crossings
  {
    code: 'ROAD-RING-N',
    name: 'Campus Ring Road - North Segment',
    locationType: 'ROAD_PATHWAY',
    structureType: 'SEGMENT_BASED',
    zone: 'Perimeter Road',
    fullPath: 'Campus Ring Road > North Section (Gate 1 to Library)',
    description: 'Paved thoroughfare with pedestrian walkway and street lights.',
  },
  {
    code: 'ROAD-SUBWAY-01',
    name: 'Academic-Hostel Connecting Subway Corridor',
    locationType: 'ROAD_PATHWAY',
    structureType: 'SEGMENT_BASED',
    zone: 'Central Connector',
    fullPath: 'Main Quad > Underpass Link to Hostels',
    description: 'Illuminated all-weather pedestrian passage.',
  },

  // 11. Grounds, playgrounds, and sports facilities
  {
    code: 'SPORT-CRIC-01',
    name: 'Main Sports Stadium & Cricket Ground',
    locationType: 'SPORTS_GROUND',
    structureType: 'ZONE_BASED',
    zone: 'Athletic Complex',
    fullPath: 'South Campus > University Sports Arena',
    description: 'Full-sized outdoor turf with floodlights and spectator stands.',
  },
  {
    code: 'SPORT-GYM-01',
    name: 'Indoor Badminton & Fitness Gymnasium',
    locationType: 'SPORTS_GROUND',
    structureType: 'ROOM_BASED',
    zone: 'Athletic Complex',
    buildingName: 'Sports Complex',
    floor: 'Ground Floor',
    roomNumber: 'Indoor Gymnasium',
    fullPath: 'Sports Complex > Ground Floor > Indoor Gymnasium',
    description: 'Wood-floor courts and fitness equipment.',
  },

  // 12. Toilets and drinking-water facilities
  {
    code: 'SANI-WASH-E1',
    name: 'Restrooms & Washroom Suite East Wing',
    locationType: 'SANITATION',
    structureType: 'ROOM_BASED',
    zone: 'Academic Quadrant',
    buildingName: 'Main Block',
    floor: '1st Floor',
    roomNumber: 'Washroom East Wing',
    fullPath: 'Main Block > 1st Floor > Washroom East Wing',
    description: 'Student sanitation and hygiene facilities.',
  },
  {
    code: 'SANI-RO-02',
    name: 'Central RO Drinking Water Station 2',
    locationType: 'SANITATION',
    structureType: 'STANDALONE',
    zone: 'Academic Quadrant',
    buildingName: 'Main Block',
    floor: '2nd Floor',
    roomNumber: 'Corridor Water Dispenser',
    fullPath: 'Main Block > 2nd Floor > RO Dispenser 2',
    description: 'Cold purified drinking water dispenser.',
  },

  // 13. Gardens, landscaping, and outdoor areas
  {
    code: 'OUT-BOTANIC-01',
    name: 'Central Botanical Garden & Lawns',
    locationType: 'OUTDOOR_AREA',
    structureType: 'ZONE_BASED',
    zone: 'Central Campus',
    fullPath: 'Central Quad > Botanical Gardens',
    description: 'Landscaped green area with seating benches and solar illumination.',
  },

  // 14. Electrical rooms, water infrastructure, and utilities
  {
    code: 'UTIL-GEN-01',
    name: 'High-Tension Transformer & Generator Room',
    locationType: 'UTILITY_ROOM',
    structureType: 'STANDALONE',
    zone: 'Substation Perimeter',
    buildingName: 'Power House Block',
    floor: 'Ground Floor',
    roomNumber: 'Transformer Bay 1',
    fullPath: 'Power House > Transformer Bay 1',
    description: 'Campus primary 500kVA backup diesel generator and electrical distribution breakers.',
  },
  {
    code: 'UTIL-PUMP-01',
    name: 'Water Overhead Reservoir & Pump Station',
    locationType: 'UTILITY_ROOM',
    structureType: 'STANDALONE',
    zone: 'Water Works',
    buildingName: 'Water Works Complex',
    floor: 'Ground Floor',
    roomNumber: 'Pump Control Room',
    fullPath: 'Water Works > Pump Control Room',
    description: 'Borewell pumps and campus water purification distribution tanks.',
  },
];

const campusCategoryDefs = [
  {
    name: 'Emergency & Safety Incidents',
    description: 'Immediate danger, fire, electrical hazard, medical crisis, or safety SOS',
    icon: 'ShieldAlert',
    defaultDepartment: 'Security & Women Safety Cell',
    defaultSLAHours: 1,
    subcategories: ['Fire Incident', 'Physical Injury / SOS', 'Dangerous Electrical Hazard', 'Security Trespass', 'Hazardous Chemical Spill'],
  },
  {
    name: 'Women Safety & SOS',
    description: 'Harassment, stalking, distress, or immediate female student safety assistance',
    icon: 'ShieldAlert',
    defaultDepartment: 'Security & Women Safety Cell',
    defaultSLAHours: 1,
    subcategories: ['Verbal / Online Harassment', 'Stalking on Campus', 'Hostel Security Concern', 'Immediate Physical Threat', 'Confidential Distress'],
  },
  {
    name: 'Electrical Maintenance',
    description: 'Flickering lights, damaged fans, power tripping, or socket issues',
    icon: 'Zap',
    defaultDepartment: 'Electrical Maintenance',
    defaultSLAHours: 12,
    subcategories: ['Ceiling Fan Malfunction', 'Lighting Failure', 'Wall Socket / Switch Burn', 'AC Unit Failure', 'Circuit Breaker Trip'],
  },
  {
    name: 'Plumbing & Water Supply',
    description: 'Water leakages, tap blockages, dry washrooms, or water filter issues',
    icon: 'Droplets',
    defaultDepartment: 'Plumbing Unit',
    defaultSLAHours: 12,
    subcategories: ['Pipe Leakage', 'No Water in Restroom', 'Clogged Drain / Sewer', 'RO Purifier Malfunction', 'Overhead Tank Overflow'],
  },
  {
    name: 'Civil Maintenance & Classroom',
    description: 'Broken benches, window glass, masonry cracks, or whiteboard repair',
    icon: 'Building2',
    defaultDepartment: 'Civil & Furniture',
    defaultSLAHours: 24,
    subcategories: ['Broken Desk / Bench', 'Damaged Door / Lock', 'Window Glass Broken', 'Wall Paint / Plaster Peel', 'Ceiling Dampness'],
  },
  {
    name: 'Cleaning & Sanitation',
    description: 'Trash overflow, littered grounds, uncleaned restrooms, or foul odor',
    icon: 'Trash2',
    defaultDepartment: 'Sanitation Team',
    defaultSLAHours: 8,
    subcategories: ['Unsanitary Restroom', 'Garbage Bin Overflow', 'Corridor Litter', 'Stagnant Water / Mosquitoes', 'Floor Mopping Required'],
  },
  {
    name: 'Laboratory Equipment & Research',
    description: 'Malfunctioning oscilloscopes, microscopes, CNC machines, or fume hoods',
    icon: 'FlaskConical',
    defaultDepartment: 'Civil & Furniture',
    defaultSLAHours: 18,
    subcategories: ['Testing Equipment Defect', 'Chemical Fume Hood Failure', 'Machine Guard Damage', 'Power Fluctuation in Lab', 'Precision Instrument Calibration'],
  },
  {
    name: 'Hostel Facilities',
    description: 'Hostel mess food, hot water geyser, cot damage, or room lighting',
    icon: 'Home',
    defaultDepartment: 'Civil & Furniture',
    defaultSLAHours: 12,
    subcategories: ['Geyser / Hot Water Failure', 'Damaged Wardrobe / Cot', 'Hostel Corridor Light', 'Washing Machine Glitch', 'Pest / Insect Infestation'],
  },
  {
    name: 'Canteen & Food Quality',
    description: 'Food hygiene, canteen water dispenser, kitchen hygiene, or seating',
    icon: 'Utensils',
    defaultDepartment: 'Sanitation Team',
    defaultSLAHours: 8,
    subcategories: ['Food Quality / Freshness', 'Canteen Seating Cleanliness', 'Drinking Water Station', 'Pantry Sanitation', 'Billing / Counter Infrastructure'],
  },
  {
    name: 'Parking & Security Infrastructure',
    description: 'Boom barrier damage, poor parking lighting, unauthorized parking, or CCTV',
    icon: 'Car',
    defaultDepartment: 'Security & Women Safety Cell',
    defaultSLAHours: 12,
    subcategories: ['Parking Light Outage', 'Boom Barrier Stuck', 'CCTV Camera Blindspot', 'Bicycle Shed Roof Damage', 'Blocked Emergency Exit'],
  },
  {
    name: 'Bus & Transport Incidents',
    description: 'College bus breakdown, delay, seat damage, or reckless driving report',
    icon: 'Bus',
    defaultDepartment: 'Civil & Furniture',
    defaultSLAHours: 6,
    subcategories: ['Bus Mechanical Breakdown', 'Punctuality / Delay', 'AC / Fan in Bus Not Working', 'Bus Stop Shelter Damage', 'Student Overcrowding / Route Issue'],
  },
  {
    name: 'Road, Pathway & Subway Safety',
    description: 'Potholes, broken pavers, dark pathway lights, or subway flooding',
    icon: 'Footprints',
    defaultDepartment: 'Civil & Furniture',
    defaultSLAHours: 18,
    subcategories: ['Pathway Pothole / Uneven Surface', 'Path Streetlight Outage', 'Subway Waterlogging', 'Slippery Pedestrian Ramp', 'Faded Zebra Crossing'],
  },
  {
    name: 'Sports Facilities & Gymnasium',
    description: 'Torn badminton nets, floodlight failure, turf damage, or gym machine defect',
    icon: 'Trophy',
    defaultDepartment: 'Civil & Furniture',
    defaultSLAHours: 24,
    subcategories: ['Gym Equipment Breakdown', 'Ground Floodlight Outage', 'Court Surface Crack', 'Torn Sports Net / Post Damage', 'Sports Equipment Storage'],
  },
  {
    name: 'IT & Campus Networking',
    description: 'WiFi dead zones, faulty projector, LAN port damage, or server access',
    icon: 'Wifi',
    defaultDepartment: 'IT & Multimedia Support',
    defaultSLAHours: 8,
    subcategories: ['WiFi Down / Slow Speed', 'Classroom Projector Audio/Video Glitch', 'LAN Port Broken', 'Smart Board Malfunction', 'Lab Terminal Boot Failure'],
  },
];

/**
 * Ensures complete campus locations and categories exist in the database without destroying existing data
 */
export const ensureCampusLocationsAndCategories = async (): Promise<void> => {
  try {
    // 0. Drop legacy un-filtered unique index if present so partialFilterExpression takes effect
    try {
      const indexes = await Location.collection.indexes();
      const oldIndex = indexes.find((idx: any) => idx.name === 'buildingName_1_floor_1_roomNumber_1');
      if (oldIndex && !oldIndex.partialFilterExpression) {
        console.log('[Campus Locations] Migrating legacy unique index on buildingName/floor/roomNumber to partial filter...');
        await Location.collection.dropIndex('buildingName_1_floor_1_roomNumber_1');
        await Location.syncIndexes();
      }
    } catch (idxErr) {
      // Ignore index drop errors if index does not exist
    }

    // 1. Ensure Categories exist or are updated with subcategories
    for (const catDef of campusCategoryDefs) {
      await Category.findOneAndUpdate(
        { name: catDef.name },
        {
          $setOnInsert: {
            name: catDef.name,
            description: catDef.description,
            icon: catDef.icon,
            defaultDepartment: catDef.defaultDepartment,
            defaultSLAHours: catDef.defaultSLAHours,
          },
          $set: {
            subcategories: catDef.subcategories,
          },
        },
        { upsert: true, new: true }
      );
    }

    // 2. Ensure Locations exist
    for (const locDef of campusLocationDefs) {
      const existing = await Location.findOne({
        $or: [
          { code: locDef.code },
          ...(locDef.buildingName && locDef.roomNumber
            ? [{ buildingName: locDef.buildingName, floor: locDef.floor, roomNumber: locDef.roomNumber }]
            : []),
        ],
      });

      if (!existing) {
        await Location.create({
          code: locDef.code,
          name: locDef.name,
          locationType: locDef.locationType,
          structureType: locDef.structureType,
          zone: locDef.zone,
          fullPath: locDef.fullPath,
          buildingName: locDef.buildingName,
          floor: locDef.floor,
          roomNumber: locDef.roomNumber,
          description: locDef.description,
          isActive: true,
        });
      } else {
        // Backfill fields if missing on existing documents
        let updated = false;
        if (!existing.code) {
          existing.code = locDef.code;
          updated = true;
        }
        if (!existing.locationType) {
          existing.locationType = locDef.locationType;
          updated = true;
        }
        if (!existing.fullPath) {
          existing.fullPath = locDef.fullPath;
          updated = true;
        }
        if (!existing.structureType) {
          existing.structureType = locDef.structureType;
          updated = true;
        }
        if (updated) {
          await existing.save();
        }
      }
    }

    console.log('[Campus Locations] Successfully validated and populated all 15 location categories and 14 complaint categories.');
  } catch (error) {
    console.error('[Campus Locations] Warning: Error checking campus locations setup:', error);
  }
};
