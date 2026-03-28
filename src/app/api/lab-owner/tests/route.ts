import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// =========================================================================
// GET: Fetch Tests (Standard View - No Limits Check Needed)
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'ALL';

    // 1. Build Filter
    const whereClause: any = {
      labId: user.labId,
      ...(status !== 'ALL' && { status: status as any }),
      OR: search ? [
        { testNumber: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { patient: { phone: { contains: search, mode: 'insensitive' } } },
      ] : undefined
    };

    // 2. Fetch Data
    const [tests, total] = await Promise.all([
      prisma.test.findMany({
        where: whereClause,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { id: true, name: true, phone: true, gender: true, age: true, patientId: true } },
          
          // Fetch Doctor Name
          doctor: { 
            select: { 
              user: {
                select: { name: true }
              }
            } 
          }, 
        }
      }),
      prisma.test.count({ where: whereClause })
    ]);

    // 3. Format Response
    const formattedTests = tests.map(t => ({
      id: t.id,
      testNumber: t.testNumber,
      testName: t.testName,
      code: t.testCode,
      price: t.finalPrice,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt,
      reportUrl: t.reportUrl,
      
      patient: {
        id: t.patient.id,
        name: t.patient.name,
        details: `${t.patient.gender?.charAt(0)} / ${t.patient.age}`,
        phone: t.patient.phone,
        pid: t.patient.patientId
      },
      
      collection: {
        by: 'Phlebo A.', // Placeholder or fetch real collector
        at: t.sampleCollectedAt || t.createdAt,
        location: 'Home Collection' 
      },
      
      refBy: t.doctor?.user?.name || t.referredBy || 'Self'
    }));

    return NextResponse.json({
      data: formattedTests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =========================================================================
// POST: Create New Test (✅ ENFORCES MONTHLY LIMITS & USAGE)
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // ------------------------------------------------------------
    // 🛑 1. SUBSCRIPTION & LIMIT CHECK (The Gatekeeper)
    // ------------------------------------------------------------
    const subscription = await prisma.subscription.findUnique({
      where: { labId: user.labId },
      include: { plan: true, currentUsage: true }
    });

    if (!subscription || !subscription.currentUsage) {
       return NextResponse.json({ error: "No active subscription found." }, { status: 403 });
    }

    // A. Check Status
    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
        return NextResponse.json({ error: "Subscription is inactive. Please renew." }, { status: 403 });
    }
    
    // B. Check Test Limits
    // Formula: Limit = Plan Base + Paid Boosters + Admin Bonus
    const planLimit = subscription.plan.maxTestsPerMonth;
    const boosterLimit = subscription.boosterTests || 0;
    const bonusLimit = subscription.bonusTests || 0;
    
    if (planLimit !== -1) { // -1 means Unlimited
        const totalLimit = planLimit + boosterLimit + bonusLimit;
        const currentUsage = subscription.currentUsage.testsUsed;
        
        if (currentUsage >= totalLimit) {
             return NextResponse.json({ 
                 error: `Monthly Test Limit Reached (${currentUsage}/${totalLimit}). Please upgrade your plan or buy a booster.` 
             }, { status: 403 });
        }
    }

    // ------------------------------------------------------------
    // ✅ 2. TRANSACTION: CREATE TEST + INCREMENT USAGE
    // ------------------------------------------------------------
    
    const newTest = await prisma.$transaction(async (tx) => {
        // A. Generate or Validate Test Number
        // (You might want logic here to generate T-1001 if not provided)
        
        // B. Create the Test
        const test = await tx.test.create({
            data: {
                labId: user.labId!,
                testNumber: body.testNumber, 
                patientId: body.patientId,
                // Link to Template (optional but recommended)
                testTemplateId: body.testTemplateId || undefined,
                
                testName: body.testName,
                testCode: body.testCode,
                
                // Pricing
                price: parseFloat(body.price || 0),
                discount: parseFloat(body.discount || 0),
                finalPrice: parseFloat(body.finalPrice || 0),
                
                status: "PENDING",
                priority: body.priority || "NORMAL",
                
                // Referrals
                doctorId: body.doctorId || undefined,
                agencyId: body.agencyId || undefined,
                referredBy: body.referredBy || undefined,
            }
        });

        // C. Increment Usage Counter
        await tx.currentUsage.update({
            where: { subscriptionId: subscription.id },
            data: { testsUsed: { increment: 1 } }
        });

        return test;
    });

    return NextResponse.json(newTest);

  } catch (error: any) {
    console.error("CREATE TEST ERROR:", error);
    
    // Handle Unique Constraint (Duplicate Test Number)
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "Test Number already exists." }, { status: 409 });
    }
    
    return NextResponse.json({ error: error.message || "Failed to create test" }, { status: 500 });
  }
}