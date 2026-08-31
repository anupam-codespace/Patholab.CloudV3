import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ============================================================================
// PATCH: Update a service area
// ============================================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { pincode, areaName, deliveryFee, isActive, branchId } = body || {};

    // Verify ownership
    const existing = await prisma.serviceArea.findFirst({
      where: { id: params.id, labId: user.labId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Service area not found' }, { status: 404 });
    }

    const updated = await prisma.serviceArea.update({
      where: { id: params.id },
      data: {
        ...(pincode !== undefined ? { pincode: String(pincode).trim() } : {}),
        ...(areaName !== undefined ? { areaName: areaName?.trim() || null } : {}),
        ...(deliveryFee !== undefined ? { deliveryFee: Number(deliveryFee) } : {}),
        ...(isActive !== undefined ? { isActive: !!isActive } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      serviceArea: { ...updated, deliveryFee: Number(updated.deliveryFee) },
    });
  } catch (error: any) {
    console.error('[SERVICE_AREAS_PATCH]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Remove a service area
// ============================================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.serviceArea.findFirst({
      where: { id: params.id, labId: user.labId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Service area not found' }, { status: 404 });
    }

    await prisma.serviceArea.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[SERVICE_AREAS_DELETE]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
