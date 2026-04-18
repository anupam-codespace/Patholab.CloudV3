import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// =========================================================================
// GET: Fetch Patients (Kept unchanged)
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    
    // --- PARAMS ---
    const search = searchParams.get('search')?.trim() || '';
    const field = searchParams.get('field') || 'all'; 
    const pageParam = searchParams.get('page');
    const page = parseInt(pageParam || '1');
    const limit = 20; 
    
    // --- FILTERS ---
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const doctorFilter = searchParams.get('doctor');
    const agencyFilter = searchParams.get('agency');
    const statusFilter = searchParams.get('status');

    // --- 1. BUILD QUERY ---
    let where: any = {
      labId: user.labId,
    };

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

      switch (field) {
        case 'patientId': where.patientId = searchMode; break;
        case 'name': where.name = searchMode; break;
        case 'phone': where.phone = searchMode; break;
        case 'srfId': where.srfId = searchMode; break;
        case 'abha': where.abhaNumber = searchMode; break;
        case 'testName': where.tests = { some: { testName: searchMode } }; break;
        case 'invoiceId': where.invoices = { some: { invoiceNumber: searchMode } }; break;
        case 'sampleId': where.tests = { some: { sample: sampleIdCondition } }; break;
        case 'doctor': where.tests = { some: { doctor: { name: searchMode } } }; break;
        case 'agency': where.tests = { some: { agency: { agencyName: searchMode } } }; break;

        case 'all':
        default:
          where.OR = [
            { name: searchMode },
            { phone: searchMode },
            { patientId: searchMode },
            { invoices: { some: { invoiceNumber: searchMode } } },
            { tests: { some: { sample: sampleIdCondition } } }
          ];
          break;
      }
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
      where.AND = [...(where.AND || []), statusCondition];
    }

    // --- 3. FETCH & SORT (SMART ACTIVITY SORT) ---
    const rawPatients = await prisma.patient.findMany({
      where,
      orderBy: { updatedAt: 'desc' }, 
      take: 500, 
      include: {
        doctor: true,
        agency: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, invoiceNumber: true, grandTotal: true, discount: true, status: true, subtotal: true, createdAt: true }
        },
        tests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, testCode: true, testName: true, status: true, createdAt: true,
            referredBy: true, 
            doctor: { select: { name: true } },
            agency: { select: { agencyName: true } },
            sample: { select: { sampleId: true } }
          }
        }
      }
    });

    const sortedPatients = rawPatients.sort((a, b) => {
        const dateA = new Date(a.tests?.[0]?.createdAt || a.updatedAt).getTime();
        const dateB = new Date(b.tests?.[0]?.createdAt || b.updatedAt).getTime();
        return dateB - dateA; 
    });

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const pagedPatients = sortedPatients.slice(startIndex, endIndex);

    const total = await prisma.patient.count({ where });
    
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
// POST: Register New Patient
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // 1. Check Duplicates (Phone)
    const existing = await prisma.patient.findFirst({
        where: { labId: user.labId, phone: body.phone }
    });

    if (existing) {
        return NextResponse.json({ error: 'Patient with this phone number already exists.', patient: existing }, { status: 409 });
    }

    // ============================================================
    // 🛑 2. SUBSCRIPTION CHECK (The Gatekeeper)
    // ============================================================
    const subscription = await prisma.subscription.findUnique({
      where: { labId: user.labId },
      include: { plan: true, currentUsage: true }
    });

    if (!subscription) {
       return NextResponse.json({ error: "No active subscription found." }, { status: 403 });
    }

    let usage = subscription.currentUsage;
    if (!usage) {
        console.log(`⚠️ Auto-fixing missing usage for Sub ID: ${subscription.id}`);
        usage = await prisma.currentUsage.create({
            data: {
                subscriptionId: subscription.id,
                testsUsed: 0,
                patientsCount: 0,
                staffCount: 1,
                storageUsedGB: 0.0
            }
        });
    }

    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
        return NextResponse.json({ error: "Your subscription is inactive. Please renew to add patients." }, { status: 403 });
    }
    
    const planLimit = subscription.plan.maxPatientsTotal;
    const boosterLimit = subscription.boosterPatients || 0;
    
    if (planLimit !== -1) { 
        const totalLimit = planLimit + boosterLimit;
        const currentCount = usage.patientsCount; 
        
        if (currentCount >= totalLimit) {
             return NextResponse.json({ 
                 error: `Patient limit reached (${currentCount}/${totalLimit}). Please upgrade your plan.` 
             }, { status: 403 });
        }
    }

    // ============================================================
    // 3. GENERATE ID & PREPARE DATA
    // ============================================================
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

    // ✅ FIX: Identifies both UUIDs and Prisma CUIDs
    const isDbId = (str: string) => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const isCuid = /^c[a-z0-9]{20,}$/i.test(str);
        return isUuid || isCuid;
    };
    
    // Frontend sends either `doctorId` or `doctorName` depending on the payload structure
    const incomingDoctor = body.doctorId || body.doctorName;
    const incomingAgency = body.agencyId || body.agencyName;

    let finalDoctorId = null;
    if (incomingDoctor && incomingDoctor !== "Self") {
        if (isDbId(incomingDoctor)) {
            finalDoctorId = incomingDoctor;
        } else {
            const doc = await prisma.doctor.findFirst({
                where: { 
                    labId: user.labId,
                    name: { equals: incomingDoctor, mode: 'insensitive' }
                }
            });
            if (doc) finalDoctorId = doc.id;
        }
    }

    let finalAgencyId = null;
    if (incomingAgency && incomingAgency !== "Direct") {
        if (isDbId(incomingAgency)) {
            finalAgencyId = incomingAgency;
        } else {
            const ag = await prisma.agency.findFirst({
                where: { 
                    labId: user.labId,
                    agencyName: { equals: incomingAgency, mode: 'insensitive' }
                }
            });
            if (ag) finalAgencyId = ag.id;
        }
    }

    // ============================================================
    // ✅ 4. TRANSACTION: CREATE PATIENT + INCREMENT USAGE
    // ============================================================
    const newPatient = await prisma.$transaction(async (tx) => {
        // A. Create Patient
        const patient = await tx.patient.create({
            data: {
                labId: user.labId,
                patientId: nextId,
                name: body.name,
                age: parseInt(body.age),
                ageUnit: body.ageUnit,
                gender: body.gender,
                phone: body.phone,
                email: body.email || null,
                address: body.address || null,
                
                srfId: body.srfId || null,
                passportNumber: body.passport || null,
                abhaNumber: body.abhaNumber || null, 
                
                // ✅ Saves the verified real UUIDs/CUIDs
                doctorId: finalDoctorId,
                agencyId: finalAgencyId
            }
        });

        // B. Update Usage (Critical Step)
        await tx.currentUsage.update({
            where: { subscriptionId: subscription.id },
            data: { patientsCount: { increment: 1 } }
        });

        return patient;
    });

    return NextResponse.json(newPatient);

  } catch (error: any) {
    console.error("REGISTRATION ERROR:", error);
    if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (Array.isArray(target) && target.includes('patientId')) {
             return NextResponse.json({ error: "ID Conflict. Please click Save again." }, { status: 409 });
        }
    }
    return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
  }
}