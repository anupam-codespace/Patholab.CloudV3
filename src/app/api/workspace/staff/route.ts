import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { hash } from 'bcryptjs';

export const dynamic = 'force-dynamic';

// ==========================================
// GET: List all staff for the Lab
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const staffList = await prisma.labStaff.findMany({
      where: { labId: user.labId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            avatar: true,
            isActive: true, // System-wide active status
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            branchCode: true
          }
        }
      },
      orderBy: { joinDate: 'desc' }
    });

    return NextResponse.json(staffList);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// POST: Add new staff & Generate 9-Digit ID
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const admin = await getDataFromToken(req);
    if (!admin?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, email, phone, role, salary, department, position, branchId, password } = body;

    // 1. Determine the password (use provided, or default)
    const plainPassword = password && password.trim() !== "" ? password : "Password@123";
    const hashedPassword = await hash(plainPassword, 10); 

    // 2. Transaction to create User, generate ID, and Link to Lab
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Check if user already exists in the entire system by email
      let staffUser = await tx.user.findUnique({ where: { email } });

      if (!staffUser) {
        staffUser = await tx.user.create({
          data: {
            name,
            email,
            phone,
            password: hashedPassword,
            role: role, 
            emailVerified: true,
            isActive: true, 
          }
        });
      }

      // B. Ensure they aren't already staff in THIS lab
      const existingLink = await tx.labStaff.findUnique({
        where: {
          labId_userId: { labId: admin.labId, userId: staffUser.id }
        }
      });

      if (existingLink) {
        throw new Error("This user is already a staff member in your laboratory.");
      }

      // C. GENERATE 9-DIGIT EMPLOYEE ID
      // 1. Get 3-digit Lab Code
      const lab = await tx.lab.findUnique({ where: { id: admin.labId } });
      const alphaCode = (lab?.labCode || "GLO").substring(0, 3).toUpperCase().padEnd(3, 'X');
      
      // 2. Get 2-digit Branch Code (Fallback to "01" if no branch specified)
      let brCode = "01";
      if (branchId) {
        const branch = await tx.branch.findUnique({ where: { id: branchId } });
        if (branch?.branchCode) brCode = branch.branchCode.substring(0, 2).padStart(2, '0');
      }

      // 3. Get 4-digit sequence (Count existing staff in the lab)
      const staffCount = await tx.labStaff.count({ where: { labId: admin.labId } });
      const sequence = (staffCount + 1).toString().padStart(4, '0');

      // Final Format: e.g., GLO010001
      const generatedEmployeeId = `${alphaCode}${brCode}${sequence}`;

      // D. Create LabStaff Link with the generated ID
      const newStaff = await tx.labStaff.create({
        data: {
          labId: admin.labId,
          userId: staffUser.id,
          branchId: branchId || null,
          position: position || role,
          department: department || "General",
          salary: salary ? parseFloat(salary) : 0,
          joinDate: new Date(),
          isActive: true,
          employeeId: generatedEmployeeId, 
        },
        include: { user: true } // Return user data for the frontend
      });

      return newStaff;
    }, {
      maxWait: 5000, 
      timeout: 10000 
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("Add Staff Error:", error);
    return NextResponse.json({ error: error.message || "Database Error" }, { status: 500 });
  }
}

// ==========================================
// PATCH: Update Staff (Change Password / Toggle Active / Edit Details)
// ==========================================
export async function PATCH(req: NextRequest) {
  try {
    const admin = await getDataFromToken(req);
    if (!admin?.labId || !admin?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { staffId, userId, action, newPassword, isActive, name, phone, role, position, department, salary, branchId } = body;

    // Validate inputs
    if (!staffId || !userId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the staff belongs to this admin's lab
    const staffRecord = await prisma.labStaff.findFirst({
      where: { id: staffId, labId: admin.labId }
    });

    if (!staffRecord) {
      return NextResponse.json({ error: "Staff member not found in your laboratory" }, { status: 404 });
    }

    // ----------------------------------------------------
    // ACTION: CHANGE PASSWORD
    // ----------------------------------------------------
    if (action === "CHANGE_PASSWORD") {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      
      const newHashedPassword = await hash(newPassword, 10);
      
      await prisma.user.update({
        where: { id: userId },
        data: { password: newHashedPassword }
      });

      return NextResponse.json({ success: true, message: "Password updated successfully" });
    }

    // ----------------------------------------------------
    // ACTION: TOGGLE ACTIVE/DEACTIVE
    // ----------------------------------------------------
    if (action === "TOGGLE_STATUS") {
      await prisma.$transaction([
        prisma.labStaff.update({
          where: { id: staffId },
          data: { isActive: isActive }
        }),
        prisma.user.update({
          where: { id: userId },
          data: { isActive: isActive }
        })
      ]);

      return NextResponse.json({ success: true, message: `Staff account ${isActive ? 'activated' : 'deactivated'}` });
    }

    // ----------------------------------------------------
    // ACTION: UPDATE DETAILS
    // ----------------------------------------------------
    if (action === "UPDATE_DETAILS") {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { name, phone, role }
        }),
        prisma.labStaff.update({
          where: { id: staffId },
          data: { 
            position, 
            department, 
            salary: salary ? parseFloat(salary) : 0, 
            branchId: branchId || null 
          }
        }),
        prisma.activityLog.create({
          data: {
            userId: admin.id,
            action: "UPDATE_STAFF",
            entity: "STAFF",
            entityId: staffId,
            description: `Updated profile details for staff member: ${name}`
          }
        })
      ]);

      return NextResponse.json({ success: true, message: "Staff details updated successfully" });
    }

    return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });

  } catch (error: any) {
    console.error("Update Staff Error:", error);
    return NextResponse.json({ error: error.message || "Database Error" }, { status: 500 });
  }
}