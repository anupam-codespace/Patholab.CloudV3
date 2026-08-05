import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfYear } from 'date-fns';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

// ========================================================
// GET: FETCH LAB DETAILS, WALLET LEDGER & LTV STATS
// ========================================================
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const labId = params.id;

    // 1. Fetch Core Data with Relations
    const lab = await prisma.lab.findUnique({
      where: { id: labId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, phone: true, createdAt: true }
        },
        wallet: {
          include: {
            // Fetch the 20 most recent wallet transactions for the ledger history
            transactions: { take: 20, orderBy: { createdAt: 'desc' } }
          }
        },
        staff: {
          include: { user: { select: { name: true, email: true, role: true, avatar: true } } }
        },
        _count: {
          select: { tests: true, patients: true, staff: true }
        }
      }
    });

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 });
    }

    // 2. Aggregate Wallet Top-up History (Last 12 Months)
    const rechargesRaw = await prisma.walletTransaction.groupBy({
      by: ['createdAt'],
      where: {
        labId: labId,
        type: 'RECHARGE',
        createdAt: { gte: startOfYear(new Date()) }
      },
      _sum: { amount: true }
    });

    // Simplify graph data for frontend
    const rechargeGraph = rechargesRaw.map(r => ({
      date: r.createdAt.toISOString().split('T')[0],
      amount: r._sum.amount ? Number(r._sum.amount) : 0
    }));

    // 3. Calculate Total Lifetime Wallet Top-ups (LTV)
    const totalRecharges = await prisma.walletTransaction.aggregate({
      where: { 
        labId: labId, 
        type: 'RECHARGE'
      },
      _sum: { amount: true }
    });

    return NextResponse.json({
      ...lab,
      stats: {
        rechargeGraph,
        totalRecharges: totalRecharges._sum.amount ? Number(totalRecharges._sum.amount) : 0,
      }
    });

  } catch (error) {
    console.error('Lab Detail GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ========================================================
// PATCH: UPDATE LAB PROFILE, SETTINGS & PRICING
// ========================================================

// Strict validation schema for updating lab parameters
const updateLabSettingsSchema = z.object({
  // Wallet/Pricing Fields
  perPatientFee: z.number().min(0).optional(),
  minimumRecharge: z.number().min(0).optional(),
  isLisIntegrationPaid: z.boolean().optional(),
  // Core Lab Settings
  isActive: z.boolean().optional(),
  activeModules: z.array(z.string()).optional(),
  // Lab Profile Fields
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const labId = params.id;

    // 1. Authenticate Super Admin
    const token = req.cookies.get("token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch (err) {
      return NextResponse.json({ message: "Session expired" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    // 2. Parse Body
    const body = await req.json();
    const data = updateLabSettingsSchema.parse(body);

    // 3. Execute updates within a Transaction
    const updatedLab = await prisma.$transaction(async (tx) => {
      
      // A. Update the Wallet configurations (Pricing)
      if (data.perPatientFee !== undefined || data.minimumRecharge !== undefined || data.isLisIntegrationPaid !== undefined) {
        await tx.labWallet.update({
          where: { labId: labId },
          data: {
            ...(data.perPatientFee !== undefined && { perPatientFee: data.perPatientFee }),
            ...(data.minimumRecharge !== undefined && { minimumRecharge: data.minimumRecharge }),
            ...(data.isLisIntegrationPaid !== undefined && { isLisIntegrationPaid: data.isLisIntegrationPaid }),
          }
        });
      }

      // B. Update the core Lab configurations & Profile Details
      const labUpdate = await tx.lab.update({
        where: { id: labId },
        data: {
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.activeModules !== undefined && { activeModules: data.activeModules }),
          ...(data.name !== undefined && { name: data.name }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.city !== undefined && { city: data.city }),
          ...(data.state !== undefined && { state: data.state }),
          ...(data.licenseNumber !== undefined && { licenseNumber: data.licenseNumber }),
        },
        include: { wallet: true }
      });

      // C. Record the change in the AuditLog so history is tracked
      await tx.auditLog.create({
        data: {
          labId: labId,
          userId: decoded.userId,
          entity: "Lab_Profile_Settings",
          entityId: labId,
          action: "SUPER_ADMIN_UPDATE",
          newData: data,
        }
      });

      return labUpdate;
    });

    return NextResponse.json({ 
      message: "Lab updated successfully", 
      lab: updatedLab 
    });

  } catch (error: any) {
    console.error("Lab Settings Update Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update lab" }, { status: 500 });
  }
}