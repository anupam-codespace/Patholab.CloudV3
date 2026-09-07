import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function getAuthenticatedLabId(req: NextRequest): Promise<string | null> {
  const user = (await getDataFromToken(req)) || (await getCurrentUser());
  if (!user) return null;
  const userId = user.userId || (user as any).id;
  if (user.labId) return user.labId;

  if (userId) {
    const ownerLab = await prisma.lab.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (ownerLab) return ownerLab.id;

    const staffLab = await prisma.labStaff.findFirst({
      where: { userId, isActive: true },
      select: { labId: true },
    });
    if (staffLab) return staffLab.labId;

    if (user.role === "SUPER_ADMIN") {
      const firstLab = await prisma.lab.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      if (firstLab) return firstLab.id;
    }
  }

  return null;
}

// ============================================================================
// GET: Fetch ALL Lab Settings (Branches, Configs) - WALLET ERA UPDATED
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    
    if (!labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lab = await prisma.lab.findUnique({
      where: { id: labId },
      include: {
        owner: {
          select: { name: true, email: true, phone: true }
        },
        branches: {
          orderBy: { createdAt: 'asc' }
        },
      }
    });

    if (!lab) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({ lab });
  } catch (error) {
    console.error('[SETTINGS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ============================================================================
// PUT: Update Global Lab Settings & Communication Modules
// ============================================================================
export async function PUT(req: NextRequest) {
  try {
    const labId = await getAuthenticatedLabId(req);
    
    if (!labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Use a transaction to ensure data consistency across potential multiple table updates
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Update the Global Lab Master Record
      const updatedLab = await tx.lab.update({
        where: { id: labId },
        data: {
          // General Details
          name: body.name,
          email: body.email,
          phone: body.phone,
          address: body.address,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          
          // Legal & Banking
          licenseNumber: body.licenseNumber,
          registrationNo: body.registrationNo,
          taxId: body.taxId,
          gstNumber: body.gstNumber,
          panNumber: body.panNumber,
          entityType: body.entityType, 
          bankName: body.bankName,
          accountNumber: body.accountNumber,
          ifscCode: body.ifscCode,
          accountHolder: body.accountHolder,

          // Branding Assets
          logo: body.logo,
          letterhead: body.letterhead,
          footer: body.footer,
          signature: body.signature,
          
          // Commissions
          commissionType: body.commissionType,
          defaultDoctorCommission: body.defaultDoctorCommission ? parseFloat(body.defaultDoctorCommission.toString()) : null,
          defaultAgencyCommission: body.defaultAgencyCommission ? parseFloat(body.defaultAgencyCommission.toString()) : null,

          // Modules Toggles
          activeModules: Array.isArray(body.activeModules) ? body.activeModules : undefined,

          // Communication Modules (WhatsApp & SMS)
          whatsappApiKey: body.whatsappApiKey !== undefined ? body.whatsappApiKey : undefined,
          whatsappPhoneId: body.whatsappPhoneId !== undefined ? body.whatsappPhoneId : undefined,
          smsApiKey: body.smsApiKey !== undefined ? body.smsApiKey : undefined,
          smsSenderId: body.smsSenderId !== undefined ? body.smsSenderId : undefined,
        },
      });

      // 2. Smart Sync: Update the "Main Branch" location automatically if requested
      if (body.syncMainBranch) {
        const mainBranch = await tx.branch.findFirst({
          where: { labId: labId, isMainBranch: true }
        });

        if (mainBranch) {
          await tx.branch.update({
            where: { id: mainBranch.id },
            data: {
              address: body.address,
              city: body.city,
              state: body.state,
              pincode: body.pincode,
              phone: body.phone,
              email: body.email,
            }
          });
        }
      }

      return updatedLab;
    });

    return NextResponse.json({ 
      lab: result, 
      message: "Workspace settings optimized successfully." 
    });

  } catch (error: any) {
    console.error('[SETTINGS_PUT_ERROR]', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'License number or email collision detected.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}