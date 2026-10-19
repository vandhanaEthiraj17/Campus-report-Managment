import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Location } from '../models/Location';
import { Category } from '../models/Category';
import { Department } from '../models/Department';
import { Complaint } from '../models/Complaint';
import { importCampusData } from './importCampusData';

dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_campus_db';

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await mongoose.connect(mongoURI);

    console.log('[Seed] Importing Excel campus identity dataset...');
    await importCampusData();

    console.log('[Seed] Clearing existing User and application data...');
    await User.deleteMany({});
    await Location.deleteMany({});
    await Category.deleteMany({});
    await Department.deleteMany({});
    await Complaint.deleteMany({});

    console.log('[Seed] Seeding Departments...');
    await Department.create([
      { name: 'Electrical Maintenance', code: 'ELEC', headName: 'Prof. R. K. Sharma', contactPhone: '+91 9876543210' },
      { name: 'Plumbing Unit', code: 'PLUMB', headName: 'Mr. Suresh Kumar', contactPhone: '+91 9876543211' },
      { name: 'Sanitation Team', code: 'SAN', headName: 'Ms. Anita Roy', contactPhone: '+91 9876543212' },
      { name: 'Civil & Furniture', code: 'CIVIL', headName: 'Er. V. Patel', contactPhone: '+91 9876543213' },
      { name: 'IT & Multimedia Support', code: 'IT', headName: 'Mr. David Miller', contactPhone: '+91 9876543214' },
      { name: 'HVAC Services', code: 'HVAC', headName: 'Mr. A. Khan', contactPhone: '+91 9876543215' },
      { name: 'Security & Women Safety Cell', code: 'SEC-WSC', headName: 'Dr. K. Meenakshi (Women Safety Coordinator & HOD)', contactPhone: '+91 99529112177' },
    ]);

    console.log('[Seed] Seeding Categories...');
    const categories = await Category.create([
      { name: 'Women Safety & SOS', description: 'Harassment, stalking, distress, or immediate female student safety assistance', icon: 'ShieldAlert', defaultDepartment: 'Security & Women Safety Cell', defaultSLAHours: 1 },
      { name: 'Broken Lights', description: 'Flickering or damaged ceiling lights', icon: 'Zap', defaultDepartment: 'Electrical Maintenance', defaultSLAHours: 24 },
      { name: 'Fan Issues', description: 'Ceiling fans not spinning or producing loud noise', icon: 'Fan', defaultDepartment: 'Electrical Maintenance', defaultSLAHours: 24 },
      { name: 'Water Leakage', description: 'Pipe leakages or overflowing taps', icon: 'Droplets', defaultDepartment: 'Plumbing Unit', defaultSLAHours: 12 },
      { name: 'Washroom Problems', description: 'Flush issues or clogged drains', icon: 'Bath', defaultDepartment: 'Plumbing Unit', defaultSLAHours: 12 },
      { name: 'Garbage & Overflow', description: 'Uncollected trash bins or littered corridors', icon: 'Trash2', defaultDepartment: 'Sanitation Team', defaultSLAHours: 8 },
      { name: 'Broken Benches & Desk', description: 'Damaged classroom furniture or benches', icon: 'Armchair', defaultDepartment: 'Civil & Furniture', defaultSLAHours: 48 },
      { name: 'Classroom Damage', description: 'Broken doors, windows, or whiteboard damage', icon: 'DoorClosed', defaultDepartment: 'Civil & Furniture', defaultSLAHours: 48 },
      { name: 'Projector & AV Issues', description: 'Projector display failing or sound system glitch', icon: 'Tv', defaultDepartment: 'IT & Multimedia Support', defaultSLAHours: 12 },
      { name: 'WiFi & Network', description: 'No internet access or slow WiFi access points', icon: 'Wifi', defaultDepartment: 'IT & Multimedia Support', defaultSLAHours: 12 },
      { name: 'Electrical Hazards', description: 'Exposed wires or burning smell from socket', icon: 'AlertTriangle', defaultDepartment: 'Electrical Maintenance', defaultSLAHours: 4 },
      { name: 'Safety Hazards', description: 'Slippery floor, broken glass, or fire hazard', icon: 'ShieldAlert', defaultDepartment: 'Civil & Furniture', defaultSLAHours: 4 },
      { name: 'Others', description: 'Miscellaneous campus or facility issues', icon: 'HelpCircle', defaultDepartment: 'Civil & Furniture', defaultSLAHours: 24 },
    ]);

    console.log('[Seed] Seeding Locations...');
    const locations = await Location.create([
      { buildingName: 'Main Block', floor: '1st Floor', roomNumber: 'Room 101' },
      { buildingName: 'Main Block', floor: '1st Floor', roomNumber: 'Computer Lab 1' },
      { buildingName: 'Main Block', floor: '1st Floor', roomNumber: 'Washroom East Wing' },
      { buildingName: 'Main Block', floor: '2nd Floor', roomNumber: 'Seminar Hall A' },
      { buildingName: 'Main Block', floor: '2nd Floor', roomNumber: 'Room 204' },
      { buildingName: 'Main Block', floor: '3rd Floor', roomNumber: 'Auditorium' },
      { buildingName: 'MBA Block', floor: '1st Floor', roomNumber: 'Room 108' },
      { buildingName: 'Arch Block', floor: '1st Floor', roomNumber: 'Studio A' },
      { buildingName: 'Civil Block', floor: '1st Floor', roomNumber: 'Mechanical Workshop' },
      { buildingName: 'Canteen', floor: '1st Floor', roomNumber: 'Main Hall' },
      { buildingName: 'Stores', floor: '1st Floor', roomNumber: 'Inventory Room 1' },
      { buildingName: 'Library Block', floor: '1st Floor', roomNumber: 'Digital Reading Room' },
    ]);

    console.log('[Seed] Seeding Default User Accounts...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const student = await User.create({
      name: 'SURYA NARAYANAN K',
      identifier: '6176AC21UCS143',
      registerNumber: '6176AC21UCS143',
      email: '6176ac21ucs143@campus.edu',
      passwordHash,
      role: 'STUDENT',
      department: 'CSE',
      phone: '+91 9123456789',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Surya',
      isActive: true,
      isEmailVerified: true,
      isVerified: true,
    });

    const vandhanaStudent = await User.create({
      name: 'Vandhana Ethiraj',
      identifier: '6176AC21UCS170',
      registerNumber: '6176AC21UCS170',
      email: 'vandhana@adhiyamaan.ac.in',
      passwordHash,
      role: 'STUDENT',
      department: 'CSE',
      phone: '+91 9876543219',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vandhana',
      isActive: true,
      isEmailVerified: true,
      isVerified: true,
    });

    const faculty = await User.create({
      name: 'Dr. Arun Kumar',
      identifier: 'FAC-CSE-001',
      facultyId: 'FAC-CSE-001',
      email: 'fac-cse-001@campus.edu',
      passwordHash,
      role: 'FACULTY',
      department: 'CSE',
      phone: '+91 9123456790',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arun',
      isActive: true,
      isEmailVerified: true,
      isVerified: true,
    });

    const admin = await User.create({
      name: 'Chief Admin (Campus Director)',
      identifier: 'ADMIN-001',
      email: 'admin@campus.edu',
      passwordHash,
      role: 'ADMIN',
      department: 'Estate Management',
      phone: '+91 9123456791',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
      isActive: true,
      isEmailVerified: true,
      isVerified: true,
    });

    const elecStaff = await User.create({
      name: 'Robert Miles (Elec Technician)',
      identifier: 'STAFF-ELEC-001',
      email: 'elec.staff@campus.edu',
      passwordHash,
      role: 'STAFF',
      department: 'Electrical Maintenance',
      phone: '+91 9123456792',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert',
      isActive: true,
      isEmailVerified: true,
      isVerified: true,
    });

    const plumbStaff = await User.create({
      name: 'Michael Scott (Plumbing Supervisor)',
      identifier: 'STAFF-PLUMB-001',
      email: 'plumb.staff@campus.edu',
      passwordHash,
      role: 'STAFF',
      department: 'Plumbing Unit',
      phone: '+91 9123456793',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
      isActive: true,
      isEmailVerified: true,
      isVerified: true,
    });

    const itStaff = await User.create({
      name: 'David Chen (IT Specialist)',
      identifier: 'STAFF-IT-001',
      email: 'it.staff@campus.edu',
      passwordHash,
      role: 'STAFF',
      department: 'IT & Multimedia Support',
      phone: '+91 9123456794',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
      isActive: true,
      isEmailVerified: true,
      isVerified: true,
    });

    console.log('[Seed] Seeding Initial Complaints...');

    // Complaint 1: In Progress
    const projCategory = categories.find((c) => c.name.includes('Projector')) || categories[0];
    const semHallLoc = locations.find((l) => l.roomNumber === 'Seminar Hall A') || locations[0];
    const sla1 = new Date();
    sla1.setHours(sla1.getHours() + 12);

    await Complaint.create({
      ticketId: 'CMP-2026-1001',
      title: 'Projector display flickering during lectures',
      description: 'The overhead HDMI projector in Seminar Hall A flickers continuously every 10 seconds, interrupting presentations.',
      category: projCategory._id,
      categoryName: projCategory.name,
      location: semHallLoc._id,
      locationDetails: {
        buildingName: semHallLoc.buildingName,
        floor: semHallLoc.floor,
        roomNumber: semHallLoc.roomNumber,
      },
      reportedBy: faculty._id,
      reportedByName: faculty.name,
      priority: 'High',
      assignedDepartment: 'IT & Multimedia Support',
      assignedStaff: itStaff._id,
      assignedStaffName: itStaff.name,
      beforeImages: [
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
      ],
      slaDueDate: sla1,
      status: 'In Progress',
      timeline: [
        { status: 'Reported', updatedBy: faculty._id, updatedByName: faculty.name, timestamp: new Date(Date.now() - 3600000 * 5), remarks: 'Issue reported by Faculty' },
        { status: 'Assigned', updatedBy: admin._id, updatedByName: admin.name, timestamp: new Date(Date.now() - 3600000 * 3), remarks: 'Assigned to IT Support (David Chen)' },
        { status: 'Accepted', updatedBy: itStaff._id, updatedByName: itStaff.name, timestamp: new Date(Date.now() - 3600000 * 2), remarks: 'Technician accepted task' },
        { status: 'In Progress', updatedBy: itStaff._id, updatedByName: itStaff.name, timestamp: new Date(Date.now() - 3600000 * 1), remarks: 'Replacing HDMI transmitter cable' },
      ],
    });

    // Complaint 2: Resolved
    const leakCategory = categories.find((c) => c.name.includes('Water')) || categories[0];
    const washroomLoc = locations.find((l) => l.roomNumber?.includes('Washroom')) || locations[0];
    const sla2 = new Date();
    sla2.setHours(sla2.getHours() + 6);

    await Complaint.create({
      ticketId: 'CMP-2026-1002',
      title: 'Water tap leaking continuously in East Washroom',
      description: 'The main basin tap in Ground Floor East Washroom is broken at the valve causing continuous water wastage.',
      category: leakCategory._id,
      categoryName: leakCategory.name,
      location: washroomLoc._id,
      locationDetails: {
        buildingName: washroomLoc.buildingName,
        floor: washroomLoc.floor,
        roomNumber: washroomLoc.roomNumber,
      },
      reportedBy: student._id,
      reportedByName: student.name,
      priority: 'Urgent',
      assignedDepartment: 'Plumbing Unit',
      assignedStaff: plumbStaff._id,
      assignedStaffName: plumbStaff.name,
      beforeImages: [
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
      ],
      afterImages: [
        'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=600&q=80',
      ],
      resolutionNotes: 'Replaced brass valve washer and tightened faucet assembly. No leak detected.',
      slaDueDate: sla2,
      status: 'Resolved',
      timeline: [
        { status: 'Reported', updatedBy: student._id, updatedByName: student.name, timestamp: new Date(Date.now() - 3600000 * 8), remarks: 'Reported by Student' },
        { status: 'Assigned', updatedBy: admin._id, updatedByName: admin.name, timestamp: new Date(Date.now() - 3600000 * 6), remarks: 'Assigned to Plumbing Unit' },
        { status: 'In Progress', updatedBy: plumbStaff._id, updatedByName: plumbStaff.name, timestamp: new Date(Date.now() - 3600000 * 4), remarks: 'Technician on site with spare parts' },
        { status: 'Resolved', updatedBy: plumbStaff._id, updatedByName: plumbStaff.name, timestamp: new Date(Date.now() - 3600000 * 1), remarks: 'Repair complete with proof photo attached' },
      ],
    });

    console.log('[Seed] Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    process.exit(1);
  }
};

seedData();
