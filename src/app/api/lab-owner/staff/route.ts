import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';
import { hash } from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET: List all staff
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
            avatar: true
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

// POST: Add new staff
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, email, phone, role, salary, department, position } = body;

    // ✅ FIX 1: Pre-calculate hash OUTSIDE the transaction
    // This prevents the DB connection from timing out while CPU is working
    const hashedPassword = await hash("Password@123", 10); 

    // 2. Transaction to create User and Link to Lab
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Check if user already exists
      let staffUser = await tx.user.findUnique({ where: { email } });

      if (!staffUser) {
        // B. Create new user if doesn't exist
        staffUser = await tx.user.create({
          data: {
            name,
            email,
            phone,
            password: hashedPassword, // Use pre-calculated hash
            role: role, 
            emailVerified: true, 
          }
        });
      }

      // C. Check if already staff in THIS lab
      const existingLink = await tx.labStaff.findUnique({
        where: {
          labId_userId: { labId: user.labId, userId: staffUser.id }
        }
      });

      if (existingLink) {
        throw new Error("User is already a staff member in this lab.");
      }

      // D. Create LabStaff Link
      const newStaff = await tx.labStaff.create({
        data: {
          labId: user.labId,
          userId: staffUser.id,
          position: position || role,
          department: department || "General",
          salary: salary ? parseFloat(salary) : 0,
          joinDate: new Date(),
          isActive: true
        }
      });

      return newStaff;
    }, {
      maxWait: 5000, // Wait max 5s for a connection
      timeout: 10000 // Allow transaction to run for 10s
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("Add Staff Error:", error);
    return NextResponse.json({ error: error.message || "Database Error" }, { status: 500 });
  }
}