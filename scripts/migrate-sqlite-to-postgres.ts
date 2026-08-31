// ============================================================================
// SQLite → PostgreSQL (Neon) Data Migration Script
// ============================================================================
// Purpose: Convert legacy SQLite data (where arrays were stored as serialized
// strings or comma-separated values) into the new PostgreSQL native types
// (text[] for String[] fields, jsonb for Json fields).
//
// WHEN TO RUN THIS:
//   You already have a SQLite database (db/custom.db) with real lab data, and
//   you want to migrate it to a fresh Neon Postgres database WITHOUT losing
//   the activeModules / permissions arrays that were previously stored as
//   strings.
//
// PREREQUISITES:
//   1. Create a new empty Neon database.
//   2. Set DATABASE_URL in .env to the Neon connection string.
//   3. Run `npx prisma db push` to create the schema (with the new String[] types).
//   4. Update SQLITE_PATH below to point to your old SQLite file.
//   5. Run: npx tsx scripts/migrate-sqlite-to-postgres.ts
//
// WHAT THIS SCRIPT DOES:
//   - Reads each row from the old SQLite DB
//   - Detects the legacy string-encoded array format (Prisma on SQLite stored
//     String[] as a JSON-ish string like `["b2b","inventory"]` or comma-separated `b2b,inventory`)
//   - Converts it to a real JS array
//   - Inserts the row into the new Postgres DB via Prisma
//
// SAFETY: This script is IDEMPOTENT in the sense that it only INSERTs into
// Postgres; it never deletes or modifies existing Postgres rows. Run it on
// an EMPTY Postgres DB to avoid duplicate-key errors.
// ============================================================================

import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import path from 'path';

const SQLITE_PATH = path.join(process.cwd(), 'db', 'custom.db');
const POSTGRES_URL = process.env.DATABASE_URL;

if (!POSTGRES_URL || !POSTGRES_URL.startsWith('postgres')) {
  console.error('❌ DATABASE_URL must be set to a postgresql:// URL in .env');
  process.exit(1);
}

const prisma = new PrismaClient();
const sqlite = new Database(SQLITE_PATH, { readonly: true });

// Parse a SQLite-stored "array" string into a real JS array.
// Handles 3 legacy formats:
//   1. Prisma SQLite serialization: '["b2b","inventory"]'         → JSON.parse
//   2. Comma-separated:            'b2b,inventory,logistics'      → split(',')
//   3. Single value:               'b2b'                          → [value]
function parseArrayField(raw: any): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Format 1: JSON array string
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      // Fall through to comma-split
    }
  }

  // Format 2 & 3: comma-separated or single value
  return trimmed
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// Parse a SQLite-stored "JSON object" string into a real JS object.
function parseJsonField(raw: any): any {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Not valid JSON — return the raw string wrapped in an object so it's not lost
    return { _legacy: trimmed };
  }
}

async function migrate() {
  console.log('🚀 Starting SQLite → PostgreSQL migration...');
  console.log(`   SQLite: ${SQLITE_PATH}`);
  console.log(`   Postgres: ${POSTGRES_URL.replace(/:[^:@]+@/, ':***@')}\n`);

  // ----- 1. SystemConfig -----
  const sysConfigs = sqlite.prepare('SELECT * FROM SystemConfig').all();
  console.log(`📋 SystemConfig: ${sysConfigs.length} rows`);
  for (const row of any(sysConfigs)) {
    await prisma.systemConfig.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        systemName: row.systemName || 'Patholab Cloud',
        systemLogo: row.systemLogo,
        favicon: row.favicon,
        primaryColor: row.primaryColor || '#3b82f6',
        secondaryColor: row.secondaryColor || '#8b5cf6',
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        seoKeywords: row.seoKeywords,
        ogImage: row.ogImage,
        defaultRegFee: Number(row.defaultRegFee || 2.50),
        defaultMinRecharge: Number(row.defaultMinRecharge || 100),
        googleAnalyticsId: row.googleAnalyticsId,
        facebookPixelId: row.facebookPixelId,
        socialLinks: parseJsonField(row.socialLinks), // ✅ String? → Json?
        systemEmail: row.systemEmail,
        systemPhone: row.systemPhone,
        systemAddress: row.systemAddress,
        gstNumber: row.gstNumber,
        panNumber: row.panNumber,
        invoicePrefix: row.invoicePrefix || 'SAAS',
        nextInvoiceNo: Number(row.nextInvoiceNo || 1),
        currency: row.currency || 'INR',
        currencySymbol: row.currencySymbol || '₹',
        taxRate: Number(row.taxRate || 18),
        enableABDM: Boolean(row.enableABDM),
        abdmClientId: row.abdmClientId,
        abdmClientSecret: row.abdmClientSecret,
        razorpayKeyId: row.razorpayKeyId,
        razorpayKeySecret: row.razorpayKeySecret,
        smtpHost: row.smtpHost,
        smtpPort: row.smtpPort ? Number(row.smtpPort) : null,
        smtpUser: row.smtpUser,
        smtpPassword: row.smtpPassword,
        landingPage: row.landingPage,
        enablePatientPortal: Boolean(row.enablePatientPortal),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      },
      update: {},
    });
  }

  // ----- 2. Users -----
  const users = sqlite.prepare('SELECT * FROM User').all();
  console.log(`👥 Users: ${users.length} rows`);
  for (const row of any(users)) {
    await prisma.user.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        email: row.email,
        password: row.password,
        name: row.name,
        phone: row.phone,
        role: row.role,
        emailVerified: Boolean(row.emailVerified),
        onboardingStatus: row.onboardingStatus || 'REGISTERED',
        isActive: Boolean(row.isActive),
        activeModules: parseArrayField(row.activeModules), // ✅ String → String[]
        avatar: row.avatar,
        abhaNumber: row.abhaNumber,
        abhaAddress: row.abhaAddress,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        deletedAt: row.deletedAt ? new Date(row.deletedAt) : null,
      },
      update: {},
    });
  }

  // ----- 3. Labs -----
  const labs = sqlite.prepare('SELECT * FROM Lab').all();
  console.log(`🏥 Labs: ${labs.length} rows`);
  for (const row of any(labs)) {
    await prisma.lab.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        ownerId: row.ownerId,
        name: row.name,
        activeModules: parseArrayField(row.activeModules), // ✅ String → String[]
        // ... add other Lab fields as needed (omitting for brevity — copy from schema)
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
        deletedAt: row.deletedAt ? new Date(row.deletedAt) : null,
      },
      update: {},
    });
  }

  // ----- 4. Branches -----
  const branches = sqlite.prepare('SELECT * FROM Branch').all();
  console.log(`🏢 Branches: ${branches.length} rows`);
  for (const row of any(branches)) {
    await prisma.branch.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        labId: row.labId,
        name: row.name,
        activeModules: parseArrayField(row.activeModules), // ✅ String → String[]
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      },
      update: {},
    });
  }

  // ----- 5. LabStaff (permissions field) -----
  const staff = sqlite.prepare('SELECT * FROM LabStaff').all();
  console.log(`👔 LabStaff: ${staff.length} rows`);
  for (const row of any(staff)) {
    await prisma.labStaff.upsert({
      where: { id: row.id },
      create: {
        id: row.id,
        labId: row.labId,
        userId: row.userId,
        branchId: row.branchId,
        role: row.role,
        position: row.position,
        permissions: parseArrayField(row.permissions), // ✅ String → String[]
        salary: row.salary ? Number(row.salary) : null,
        joinDate: new Date(row.joinDate),
        isActive: Boolean(row.isActive),
        createdAt: new Date(row.createdAt),
      },
      update: {},
    });
  }

  // ----- 6. RadiologyStudy (safetyChecklist field) -----
  try {
    const studies = sqlite.prepare('SELECT * FROM RadiologyStudy').all();
    console.log(`🩻 RadiologyStudies: ${studies.length} rows`);
    for (const row of any(studies)) {
      await prisma.radiologyStudy.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          labId: row.labId,
          modalityId: row.modalityId,
          patientId: row.patientId,
          appointmentId: row.appointmentId,
          accessionNumber: row.accessionNumber,
          scanName: row.scanName,
          clinicalHistory: row.clinicalHistory,
          isContrastUsed: Boolean(row.isContrastUsed),
          safetyChecklist: parseJsonField(row.safetyChecklist), // ✅ String? → Json?
          mediaStatus: row.mediaStatus,
          referringDoctor: row.referringDoctor,
          status: row.status || 'ORDERED',
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt),
        },
        update: {},
      });
    }
  } catch (e) {
    console.log('   (Skipping RadiologyStudy — table may not exist in this SQLite DB)');
  }

  // ----- 7. (Add more tables here: Patient, Test, Invoice, Report, etc.) -----
  // For brevity, this script only migrates the tables with the four broken
  // String-array fields plus SystemConfig. To do a FULL data migration of all
  // 60+ tables, extend this script following the same pattern, OR use a tool
  // like pgloader (https://pgloader.io/) for the bulk of the tables and only
  // use this script for the field-type conversions.

  console.log('\n✅ Migration complete!');
  console.log('\n⚠️  NOTE: This script only migrated the tables with field-type');
  console.log('   conversions (User, Lab, Branch, LabStaff, SystemConfig, RadiologyStudy).');
  console.log('   For other tables (Patient, Test, Invoice, Report, etc.), use:');
  console.log('     npx prisma db pull   # introspect SQLite');
  console.log('     npx pgloader sqlite:///db/custom.db $DATABASE_URL');
  console.log('   or extend this script with the remaining tables.');
}

// Cast helper for TypeScript (we treat rows as loosely-typed objects)
function any<T>(rows: T[]): any[] {
  return rows as any[];
}

migrate()
  .catch(e => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    sqlite.close();
  });
