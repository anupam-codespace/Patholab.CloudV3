import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// =========================================================================
// GET: Fetch Patients (Enterprise DB Pagination & Branch Scoping)
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    
    // --- PARAMS ---
    const search = searchParams.get('search')?.trim() || '';
    const field = searchParams.get('field') || 'all'; 
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = 20; 
    
    // --- FILTERS ---
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const doctorFilter = searchParams.get('doctor');
    const agencyFilter = searchParams.get('agency');
    const statusFilter = searchParams.get('status');

    // --- 1. BUILD SECURE QUERY ---
    let where: any = {
      labId: user.labId,
      mergedIntoPatientId: null // 🚫 Never show patients that were merged away
    };

    // 🌍 ENTERPRISE: Branch Isolation vs Global Scope
    if (user.role !== 'LAB_OWNER' && user.role !== 'SUPER_ADMIN' && user.branchId) {
      where.AND = [
        { OR: [{ branchId: user.branchId }, { isGlobal: true }, { branchId: null }] }
      ];
    }

    // --- SEARCH LOGIC ---
    if (search) {
      const searchMode = { contains: search, mode: 'insensitive' };
      const lastHyphen = search.lastIndexOf('-');
      const strippedSearch = lastHyphen > 0 ? search.substring(0, lastHyphen) : search;
      
      const sampleIdCondition = {
        OR: [
          { sampleId: { contains: search, mode: 'insensitive' } },        
          { sampleId: { contains: strippedSearch, mode: 'insensitive' } } 
        ]
      };

      const searchCondition: any = {};

      switch (field) {
        case 'patientId': searchCondition.patientId = searchMode; break;
        case 'name': searchCondition.name = searchMode; break;
        case 'phone': searchCondition.phone = searchMode; break;
        case 'srfId': searchCondition.srfId = searchMode; break;
        case 'abha': searchCondition.abhaNumber = searchMode; break;
        case 'testName': searchCondition.tests = { some: { testName: searchMode } }; break;
        case 'invoiceId': searchCondition.invoices = { some: { invoiceNumber: searchMode } }; break;
        case 'sampleId': searchCondition.tests = { some: { sample: sampleIdCondition } }; break;
        case 'doctor': searchCondition.tests = { some: { doctor: { name: searchMode } } }; break;
        case 'agency': searchCondition.tests = { some: { agency: { agencyName: searchMode } } }; break;
        case 'all':
        default:
          searchCondition.OR = [
            { name: searchMode },
            { phone: searchMode },
            { patientId: searchMode },
            { invoices: { some: { invoiceNumber: searchMode } } },
            { tests: { some: { sample: sampleIdCondition } } }
          ];
          break;
      }
      
      where.AND = where.AND ? [...where.AND, searchCondition] : [searchCondition];
    }

    // --- 2. APPLY FILTERS ---
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
         const endDate = new Date(to);
         endDate.setHours(23, 59, 59, 999);
         where.createdAt.lte = endDate;
      }
    }
    if (doctorFilter && doctorFilter !== 'ALL') where.doctorId = doctorFilter;
    if (agencyFilter && agencyFilter !== 'ALL') where.agencyId = agencyFilter;
    if (statusFilter && statusFilter !== 'ALL') {
      const statusCondition = statusFilter === 'PAID' 
        ? { invoices: { some: { status: 'PAID' } } }
        : { invoices: { some: { status: { not: 'PAID' } } } };
      where.AND = where.AND ? [...where.AND, statusCondition] : [statusCondition];
    }

    // --- 3. FETCH & DB-LEVEL PAGINATION ---
    const [total, pagedPatients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        orderBy: { updatedAt: 'desc' }, 
        skip: (page - 1) * limit,
        take: limit, 
        include: {
          user: { select: { name: true } }, // 👤 See who created the patient
          doctor: true,
          agency: true,
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, invoiceNumber: true, finalPrice: true, discount: true, status: true, subtotal: true, createdAt: true }
          },
          tests: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true, testCode: true, testName: true, status: true, createdAt: true,
              referredBy: true, 
              doctor: { select: { name: true } },
              agency: { select: { agencyName: true } },
              sample: { select: { sampleId: true } }
            }
          }
        }
      })
    ]);
    
    return NextResponse.json({
      data: pagedPatients,
      pagination: { total, pages: Math.ceil(total / limit), current: page }
    });

  } catch (error: any) {
    console.error("API ERROR:", error);
    return NextResponse.json({ error: 'Fetch failed', details: error.message }, { status: 500 });
  }
}

// =========================================================================
// POST: Register New Patient (With Audit & Global Logic)
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const safePhone = body.phone?.trim();
    const safeName = body.name?.trim();
    const safeAge = body.age ? parseInt(body.age) : null;

    if (!safePhone || !safeName) {
      return NextResponse.json({ error: 'Name and Phone number are required.' }, { status: 400 });
    }

    // 1. Check Duplicates (Phone) - Locked to Lab
    const existing = await prisma.patient.findFirst({
        where: { labId: user.labId, phone: safePhone }
    });

    if (existing) {
        return NextResponse.json({ error: 'Patient with this phone number already exists.', patient: existing }, { status: 409 });
    }

    // 2. SUBSCRIPTION CHECK (The Gatekeeper)
    const subscription = await prisma.subscription.findUnique({
      where: { labId: user.labId },
      include: { plan: true, currentUsage: true }
    });

    if (!subscription) return NextResponse.json({ error: "No active subscription found." }, { status: 403 });

    let usage = subscription.currentUsage;
    if (!usage) {
        usage = await prisma.currentUsage.create({
            data: { subscriptionId: subscription.id, testsUsed: 0, patientsCount: 0, staffCount: 1, storageUsedGB: 0.0 }
        });
    }

    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
        return NextResponse.json({ error: "Your subscription is inactive. Please renew." }, { status: 403 });
    }
    
    const planLimit = subscription.plan.maxPatientsTotal;
    const boosterLimit = subscription.boosterPatients || 0;
    
    if (planLimit !== -1) { 
        const totalLimit = planLimit + boosterLimit;
        if (usage.patientsCount >= totalLimit) {
             return NextResponse.json({ error: `Patient limit reached (${usage.patientsCount}/${totalLimit}). Please upgrade your plan.` }, { status: 403 });
        }
    }

    // 3. GENERATE ID 
    const lastPatient = await prisma.patient.findFirst({
        where: { labId: user.labId },
        orderBy: { createdAt: 'desc' }, 
        select: { patientId: true }
    });

    let nextNumber = 1; 
    if (lastPatient && lastPatient.patientId) {
        const parts = lastPatient.patientId.split('-');
        if (parts.length === 2) {
            const lastNum = parseInt(parts[1]);
            if (!isNaN(lastNum)) nextNumber = lastNum + 1;
        }
    }
    const nextId = `P-${nextNumber.toString().padStart(5, '0')}`;
    
    // 4. RESOLVE DOCTORS & AGENCIES
    const isDbId = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) || /^c[a-z0-9]{20,}$/i.test(str);
    
    const incomingDoctor = body.doctorId || body.doctorName;
    const incomingAgency = body.agencyId || body.agencyName;

    let finalDoctorId = null;
    if (incomingDoctor && incomingDoctor !== "Self") {
        if (isDbId(incomingDoctor)) finalDoctorId = incomingDoctor;
        else {
            const doc = await prisma.doctor.findFirst({ where: { labId: user.labId, name: { equals: incomingDoctor, mode: 'insensitive' } } });
            if (doc) finalDoctorId = doc.id;
        }
    }

    let finalAgencyId = null;
    if (incomingAgency && incomingAgency !== "Direct") {
        if (isDbId(incomingAgency)) finalAgencyId = incomingAgency;
        else {
            const ag = await prisma.agency.findFirst({ where: { labId: user.labId, agencyName: { equals: incomingAgency, mode: 'insensitive' } } });
            if (ag) finalAgencyId = ag.id;
        }
    }

    // 💡 5. CLINICAL DATA COMPLETENESS: Auto-calculate DOB
    let calculatedDob = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    if (!calculatedDob && safeAge && body.ageUnit) {
      const tempDate = new Date();
      if (body.ageUnit.toUpperCase().startsWith('Y')) tempDate.setFullYear(tempDate.getFullYear() - safeAge);
      else if (body.ageUnit.toUpperCase().startsWith('M')) tempDate.setMonth(tempDate.getMonth() - safeAge);
      else if (body.ageUnit.toUpperCase().startsWith('D')) tempDate.setDate(tempDate.getDate() - safeAge);
      calculatedDob = tempDate;
    }

    // 🛡️ Admin/Owner Override for Global Scope
    const isGlobal = (user.role === 'LAB_OWNER' || user.role === 'LAB_MANAGER') ? (body.isGlobal === true) : false;

    // ✅ 6. TRANSACTION: CREATE PATIENT + INCREMENT USAGE + AUDIT LOG
    const newPatient = await prisma.$transaction(async (tx) => {
        const patient = await tx.patient.create({
            data: {
                labId: user.labId,
                branchId: isGlobal ? null : user.branchId, // Tag patient to the operating branch
                userId: user.id,         // 👤 Audit logging
                
                patientId: nextId,
                name: safeName,
                age: safeAge,
                ageUnit: body.ageUnit || null,
                dateOfBirth: calculatedDob, 
                
                // Safely map frontend string to backend Prisma Enum
                gender: body.gender ? (body.gender.toUpperCase() as any) : 'OTHER', 
                
                phone: safePhone,
                email: body.email?.trim() || null,
                address: body.address?.trim() || null,
                isGlobal: isGlobal,
                
                srfId: body.srfId?.trim() || null,
                passportNumber: body.passport?.trim() || null,
                abhaNumber: body.abhaNumber?.trim() || null, 
                
                doctorId: finalDoctorId,
                agencyId: finalAgencyId
            }
        });

        // Update Usage
        await tx.currentUsage.update({
            where: { subscriptionId: subscription.id },
            data: { patientsCount: { increment: 1 } }
        });

        // 📝 CREATE AUDIT TRAIL
        await tx.activityLog.create({
            data: {
              labId: user.labId,
              userId: user.id,
              action: 'PATIENT_CREATED',
              entityType: 'PATIENT',
              entityId: patient.id,
              details: { name: patient.name, phone: patient.phone, isGlobal }
            }
        });

        return patient;
    });

    return NextResponse.json(newPatient);

  } catch (error: any) {
    console.error("REGISTRATION ERROR:", error);
    // 🛡️ RACE CONDITION HANDLER
    if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (Array.isArray(target) && target.includes('patientId')) {
             return NextResponse.json({ error: "Another patient was registered simultaneously. Please click Save again." }, { status: 409 });
        }
    }
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}

// =========================================================================
// PATCH: Merge Duplicate Patients (Strict Lab Owner Action)
// =========================================================================
export async function PATCH(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 🛡️ SECURITY: Only Owners and Managers can merge patient records
    if (user.role !== 'LAB_OWNER' && user.role !== 'LAB_MANAGER') {
       return NextResponse.json({ error: 'Only Lab Owners/Managers can merge patient records.' }, { status: 403 });
    }

    const { primaryId, secondaryId } = await req.json();
    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      return NextResponse.json({ error: 'Invalid merge parameters.' }, { status: 400 });
    }

    // Run massive merge operation in a single ACID transaction
    await prisma.$transaction(async (tx) => {
      
      // 1. Relink all tests
      await tx.test.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId }
      });

      // 2. Relink all invoices
      await tx.invoice.updateMany({
        where: { patientId: secondaryId },
        data: { patientId: primaryId }
      });

      // 3. Mark the secondary patient as merged (Soft Delete)
      await tx.patient.update({
        where: { id: secondaryId },
        data: { 
           mergedIntoPatientId: primaryId,
           isGlobal: false // Revoke global scope if it had one
        }
      });

      // 📝 4. AUDIT LOG: Record the merge for compliance
      await tx.activityLog.create({
        data: {
          labId: user.labId,
          userId: user.id,
          action: 'PATIENT_MERGED',
          entityType: 'PATIENT',
          entityId: primaryId,
          details: { merged_from: secondaryId }
        }
      });
    });

    return NextResponse.json({ message: 'Patients merged successfully.' });

  } catch (error: any) {
    console.error("MERGE ERROR:", error);
    return NextResponse.json({ error: "Merge failed" }, { status: 500 });
  }
}