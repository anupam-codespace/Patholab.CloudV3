import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ============================================================================
// GET: List all service areas (pincodes) for the lab
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const areas = await prisma.serviceArea.findMany({
      where: { labId: user.labId },
      include: {
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ branchId: 'asc' }, { pincode: 'asc' }],
    });

    return NextResponse.json({
      serviceAreas: areas.map(a => ({
        ...a,
        deliveryFee: Number(a.deliveryFee || 0),
      })),
    });
  } catch (error: any) {
    console.error('[SERVICE_AREAS_GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ============================================================================
// POST: Add a new service area (pincode → branch mapping)
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { branchId, pincode, areaName, deliveryFee, isActive } = body || {};

    if (!branchId || !pincode) {
      return NextResponse.json(
        { error: 'branchId and pincode are required' },
        { status: 400 }
      );
    }

    // Verify the branch belongs to this lab
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, labId: user.labId },
    });
    if (!branch) {
      return NextResponse.json(
        { error: 'Branch not found in your lab' },
        { status: 404 }
      );
    }

    const area = await prisma.serviceArea.create({
      data: {
        labId: user.labId,
        branchId,
        pincode: String(pincode).trim(),
        areaName: areaName?.trim() || null,
        deliveryFee: Number(deliveryFee || 0),
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({
      success: true,
      serviceArea: { ...area, deliveryFee: Number(area.deliveryFee) },
    });
  } catch (error: any) {
    console.error('[SERVICE_AREAS_POST]', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This pincode is already mapped to this branch.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
