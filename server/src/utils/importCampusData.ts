import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as xlsx from 'xlsx';
import { ApprovedCampusMember } from '../models/ApprovedCampusMember';

dotenv.config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_campus_db';

export const formatDob = (dobVal: any): string => {
  if (!dobVal) return '';

  if (typeof dobVal === 'number') {
    const parsed = xlsx.SSF.parse_date_code(dobVal);
    if (parsed) {
      const y = parsed.y;
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  if (dobVal instanceof Date) {
    const y = dobVal.getFullYear();
    const m = String(dobVal.getMonth() + 1).padStart(2, '0');
    const d = String(dobVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(dobVal).trim();
  // Check if string matches YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // Check DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
    const parts = str.split(/[-/]/);
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  return str;
};

export const importCampusData = async () => {
  try {
    console.log('[Import] Connecting to MongoDB...');
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoURI);
    }

    const excelPath = path.join(process.cwd(), 'smart_campus_login_dataset.xlsx');
    console.log(`[Import] Reading Excel file from: ${excelPath}`);
    const workbook = xlsx.readFile(excelPath);

    let studentCount = 0;
    let facultyCount = 0;

    // 1. Process Students Sheet
    if (workbook.Sheets['Students']) {
      const studentRows: any[] = xlsx.utils.sheet_to_json(workbook.Sheets['Students']);
      for (const row of studentRows) {
        const regno = (row.regno || row.RegisterNumber || row.identifier || '').toString().trim().toUpperCase();
        if (!regno) continue;

        const name = (row.name || row.Name || '').toString().trim();
        const dept = (row.dept || row.department || row.Department || 'General').toString().trim();
        const batch = row.batch ? Number(row.batch) : undefined;
        const dob = formatDob(row.demo_dob || row.dob || row.DOB);

        await ApprovedCampusMember.findOneAndUpdate(
          { identifier: regno },
          {
            name,
            identifier: regno,
            identifierType: 'STUDENT',
            registerNumber: regno,
            department: dept,
            batch,
            dob,
            role: 'STUDENT',
          },
          { upsert: true, new: true }
        );
        studentCount++;
      }

      // Add Project Creator & Admin/Student record
      await ApprovedCampusMember.findOneAndUpdate(
        { identifier: '6176AC21UCS170' },
        {
          name: 'Vandhana Ethiraj',
          identifier: '6176AC21UCS170',
          identifierType: 'STUDENT',
          registerNumber: '6176AC21UCS170',
          department: 'CSE',
          batch: 2021,
          dob: '2003-05-17',
          role: 'STUDENT',
        },
        { upsert: true, new: true }
      );
      studentCount++;
    }

    // 2. Process Faculty Sheet
    if (workbook.Sheets['Faculty']) {
      const facultyRows: any[] = xlsx.utils.sheet_to_json(workbook.Sheets['Faculty']);
      for (const row of facultyRows) {
        const facultyId = (row.faculty_id || row.FacultyId || row.identifier || '').toString().trim().toUpperCase();
        if (!facultyId) continue;

        const name = (row.faculty_name || row.name || row.Name || '').toString().trim();
        const dept = (row.dept || row.department || row.Department || 'General').toString().trim();
        const dob = formatDob(row.demo_dob || row.dob || row.DOB);

        await ApprovedCampusMember.findOneAndUpdate(
          { identifier: facultyId },
          {
            name,
            identifier: facultyId,
            identifierType: 'FACULTY',
            facultyId,
            department: dept,
            dob,
            role: 'FACULTY',
          },
          { upsert: true, new: true }
        );
        facultyCount++;
      }
    }

    console.log(`\n====================================================`);
    console.log(`[Import] EXCEL DATA IMPORT SUMMARY`);
    console.log(`====================================================`);
    console.log(`Student records imported: ${studentCount}`);
    console.log(`Faculty records imported: ${facultyCount}`);
    console.log(`Total records imported:   ${studentCount + facultyCount}`);
    console.log(`====================================================\n`);

    return { studentCount, facultyCount };
  } catch (error) {
    console.error('[Import] Error importing campus data:', error);
    throw error;
  }
};

// Execute if run directly via CLI
if (require.main === module) {
  importCampusData().then(() => process.exit(0)).catch(() => process.exit(1));
}
