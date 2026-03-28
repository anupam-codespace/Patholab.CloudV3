import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

// PATCH: Update Staff Details
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getDataFromToken(req);
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const staffId = params.id;
    const body = await req.json();

    // Only allow updating LabStaff fields (salary, position, etc.)
    const updated = await prisma.labStaff.update({
      where: { id: staffId, labId: user.labId }, // Ensure ownership
      data: {
        position: body.position,
        department: body.department,
        salary: body.salary ? parseFloat(body.salary) : undefined,
        isActive: body.isActive
      }
    });

    return NextResponse.json(updated);

  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

// DELETE: Remove Staff (Soft Delete or Hard Delete)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getDataFromToken(req);
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const staffId = params.id;

    // We simply delete the link. The User account remains (in case they work elsewhere).
    await prisma.labStaff.delete({
      where: { id: staffId, labId: user.labId }
    });

    return NextResponse.json({ success: true, message: "Staff removed successfully" });

  } catch (error: any) {
    return NextResponse.json({ error: "Failed to remove staff" }, { status: 500 });
  }
}