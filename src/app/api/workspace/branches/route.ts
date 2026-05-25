import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ============================================================================
// GET: Fetch all Branches (Used for Dropdowns & Tables)
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const branches = await prisma.branch.findMany({
      where: { 
        labId: user.labId,
        isActive: true 
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(branches, { status: 200 });
  } catch (error) {
    console.error('[BRANCH_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ============================================================================
// POST: Create a New Branch (Enforces SaaS Plan Limits & Generates branchCode)
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    // 1. Fetch Lab and Subscription Limits
    const lab = await prisma.lab.findUnique({
      where: { id: user.labId },
      include: {
        branches: true,
        subscription: { include: { plan: true } }
      }
    });

    if (!lab || !lab.subscription) {
      return NextResponse.json({ error: 'Invalid workspace or subscription state.' }, { status: 400 });
    }

    // 2. ENFORCE SAAS LIMITS
    const currentBranchCount = lab.branches.length;
    // NOTE: If you consider the main lab as "1", make sure your logic accounts for it!
    const maxAllowedBranches = lab.subscription.plan.maxBranches + (lab.subscription.boosterBranches || 0);

    if (currentBranchCount >= maxAllowedBranches) {
      return NextResponse.json({ 
        error: `Plan limit reached. Your subscription allows a maximum of ${maxAllowedBranches} branch(es). Please upgrade to expand.` 
      }, { status: 403 });
    }

    // 3. AUTO-GENERATE 2-DIGIT BRANCH CODE (e.g., "02", "03")
    // This is required for the 9-digit Employee ID generation in the Staff API!
    const nextBranchNum = currentBranchCount + 1; 
    const generatedBranchCode = nextBranchNum.toString().padStart(2, '0');

    // 4. Create the Branch
    const newBranch = await prisma.branch.create({
      data: {
        labId: user.labId,
        name: body.name,
        code: body.code || null,
        branchCode: generatedBranchCode, // ✅ Injected for Staff IDs
        isMainBranch: body.isMainBranch || false,
        address: body.address,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        phone: body.phone,
        email: body.email,
        isActive: body.isActive !== undefined ? body.isActive : true,
      }
    });

    // 5. If this is set as Main Branch, strip the flag from older branches
    if (body.isMainBranch) {
      await prisma.branch.updateMany({
        where: { labId: user.labId, id: { not: newBranch.id } },
        data: { isMainBranch: false }
      });
    }

    return NextResponse.json({ branch: newBranch, message: "Branch added successfully." }, { status: 201 });
  } catch (error) {
    console.error('[BRANCH_POST_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ============================================================================
// PUT: Edit an Existing Branch
// ============================================================================
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) return NextResponse.json({ error: 'Branch ID is required.' }, { status: 400 });

    // Verify ownership
    const existingBranch = await prisma.branch.findFirst({
      where: { id, labId: user.labId }
    });

    if (!existingBranch) {
      return NextResponse.json({ error: 'Branch not found or access denied.' }, { status: 404 });
    }

    // Update the Branch
    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: {
        name: updateData.name,
        code: updateData.code,
        isMainBranch: updateData.isMainBranch,
        address: updateData.address,
        city: updateData.city,
        state: updateData.state,
        pincode: updateData.pincode,
        phone: updateData.phone,
        email: updateData.email,
        isActive: updateData.isActive,
      }
    });

    // Handle Main Branch uniqueness
    if (updateData.isMainBranch) {
      await prisma.branch.updateMany({
        where: { labId: user.labId, id: { not: id } },
        data: { isMainBranch: false }
      });
    }

    return NextResponse.json({ branch: updatedBranch, message: "Branch updated successfully." });
  } catch (error) {
    console.error('[BRANCH_PUT_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}