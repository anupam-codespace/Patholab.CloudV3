// src/app/api/workspace/staff/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ==========================================
// PATCH: Update Staff Details
// ==========================================
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getDataFromToken(req);
    // Note: Use admin.userId since your JWT payload uses userId
    if (!admin?.labId || !admin?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staffId = params.id;
    const body = await req.json();

    // 1. Verify ownership and get the associated userId
    const staffRecord = await prisma.labStaff.findUnique({
      where: { id: staffId, labId: admin.labId },
      include: { user: true }
    });

    if (!staffRecord) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // 2. Format the Branch ID (If frontend sends "main", convert to null for Master Lab)
    const cleanBranchId = body.branchId && body.branchId !== "main" ? body.branchId : null;

    // 3. Update BOTH the LabStaff record and the User record safely
    const updatedStaff = await prisma.$transaction([
      
      // A. Update Lab-specific employment details
      prisma.labStaff.update({
        where: { id: staffId },
        data: {
          position: body.position,
          department: body.department,
          salary: body.salary ? parseFloat(body.salary) : undefined,
          branchId: cleanBranchId, // ✅ True multi-branch assignment
          isActive: body.isActive !== undefined ? body.isActive : undefined
        }
      }),

      // B. Update Global User details (Name, Phone, Role)
      prisma.user.update({
        where: { id: staffRecord.userId },
        data: {
          name: body.name,
          phone: body.phone,
          role: body.role,
          // Keep the global user active state in sync with the lab staff state
          isActive: body.isActive !== undefined ? body.isActive : undefined 
        }
      }),

      // C. Audit Trail / Activity Log
      prisma.activityLog.create({
        data: {
          userId: admin.userId,
          action: "UPDATE_STAFF",
          entity: "STAFF",
          entityType: "STAFF",
          entityId: staffId,
          description: `Updated profile details for staff member: ${body.name || staffRecord.user.name}`
        }
      })
    ]);

    return NextResponse.json({ 
      success: true, 
      message: "Staff details updated successfully", 
      data: updatedStaff[0] 
    });

  } catch (error: any) {
    console.error("[STAFF_PATCH_ERROR]:", error);
    return NextResponse.json({ error: "Failed to update staff details" }, { status: 500 });
  }
}

// ==========================================
// DELETE: Remove Staff (Unlink from Lab)
// ==========================================
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getDataFromToken(req);
    if (!admin?.labId || !admin?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staffId = params.id;

    // 1. Verify the staff exists in this lab
    const staffRecord = await prisma.labStaff.findUnique({
      where: { id: staffId, labId: admin.labId },
      include: { user: true }
    });

    if (!staffRecord) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Prevent the Lab Owner from accidentally deleting themselves!
    if (staffRecord.userId === admin.userId) {
      return NextResponse.json({ error: "You cannot remove your own admin account." }, { status: 400 });
    }

    // 2. Transaction: Delete LabStaff link, deactivate user, and log it
    await prisma.$transaction([
      
      // A. Delete the LabStaff Link
      prisma.labStaff.delete({
        where: { id: staffId }
      }),

      // B. Suspend the User account so they can no longer log in
      // (We don't hard delete the User, just in case they have historical test reports attached to their ID)
      prisma.user.update({
        where: { id: staffRecord.userId },
        data: { isActive: false }
      }),

      // C. Audit Log for compliance
      prisma.activityLog.create({
        data: {
          userId: admin.userId,
          action: "REMOVE_STAFF",
          entity: "STAFF",
          entityType: "STAFF",
          entityId: staffId,
          description: `Removed staff member: ${staffRecord.user.name} (${staffRecord.employeeId})`
        }
      })
    ]);

    return NextResponse.json({ success: true, message: "Staff member removed successfully" });

  } catch (error: any) {
    console.error("[STAFF_DELETE_ERROR]:", error);
    return NextResponse.json({ error: "Failed to remove staff member" }, { status: 500 });
  }
}