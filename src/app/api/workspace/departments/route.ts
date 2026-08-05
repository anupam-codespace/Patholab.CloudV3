import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// =========================================================================
// 1. GET: Fetch Global Master + Local Custom Departments
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const departments = await prisma.department.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { labId: user.labId }
        ]
      },
      include: {
        // ✅ Uses the exact auto-generated Prisma relation name for the TestTemplate model
        _count: {
          select: { TestTemplate: true }
        }
      },
      orderBy: [
        { isGlobal: 'desc' },     // Group global items at the top
        { displayOrder: 'asc' },  // Respect custom sorting from the schema
        { name: 'asc' }
      ]
    });

    // Clean up the output for the frontend
    const mappedDepartments = departments.map(d => ({
      ...d,
      templateCount: d._count?.TestTemplate || 0
    }));

    return NextResponse.json({ departments: mappedDepartments }, { status: 200 });
  } catch (error) {
    console.error("Departments Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// =========================================================================
// 2. POST: Create a new Local Custom Department
// =========================================================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, code, displayOrder } = body;

    if (!name) return NextResponse.json({ error: "Department name is required" }, { status: 400 });

    const newDept = await prisma.department.create({
      data: {
        labId: user.labId,
        isGlobal: false, // 🔒 Security: Force false so labs cannot alter the global platform catalog
        name: name.trim(),
        code: code ? code.trim().toUpperCase() : null,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : 0
      }
    });

    return NextResponse.json({ success: true, department: newDept }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A department with this name already exists in your lab." }, { status: 400 });
    }
    console.error("Department Create Error:", error);
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}

// =========================================================================
// 3. PUT: Update an existing Local Custom Department
// =========================================================================
export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, name, code, displayOrder } = body;

    if (!id || !name) return NextResponse.json({ error: "ID and Name are required" }, { status: 400 });

    // 🔒 SECURITY CHECK: Verify ownership and prevent editing global departments
    const existingDept = await prisma.department.findUnique({ where: { id } });
    
    if (!existingDept) return NextResponse.json({ error: "Department not found" }, { status: 404 });
    if (existingDept.isGlobal || existingDept.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden: Cannot edit global master departments" }, { status: 403 });
    }

    const updatedDept = await prisma.department.update({
      where: { id },
      data: {
        name: name.trim(),
        code: code ? code.trim().toUpperCase() : null,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder) : existingDept.displayOrder
      }
    });

    return NextResponse.json({ success: true, department: updatedDept }, { status: 200 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A department with this name already exists." }, { status: 400 });
    }
    console.error("Department Update Error:", error);
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

// =========================================================================
// 4. DELETE: Remove a Local Custom Department
// =========================================================================
export async function DELETE(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Department ID is required" }, { status: 400 });

    // 🔒 SECURITY CHECK: Verify ownership and prevent deleting global departments
    const existingDept = await prisma.department.findUnique({ where: { id } });
    
    if (!existingDept) return NextResponse.json({ error: "Department not found" }, { status: 404 });
    if (existingDept.isGlobal || existingDept.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden: Cannot delete global master departments" }, { status: 403 });
    }

    await prisma.department.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Department deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete Department Error:", error);
    // Hard deletes will fail if there are tests attached because of foreign key constraints
    return NextResponse.json({ error: "Failed to delete department. It is likely attached to an active test in your catalog." }, { status: 500 });
  }
}