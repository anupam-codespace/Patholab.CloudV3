import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// 1. GET: Fetch Global Master + Local Custom Departments
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
        // Automatically count how many test templates use this department
        _count: {
          select: { testTemplates: true }
        }
      },
      orderBy: [
        { isGlobal: 'desc' }, // Group global items at the top
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ departments }, { status: 200 });
  } catch (error) {
    console.error("Departments Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 2. POST: Create a new Local Custom Department
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, code } = await req.json();

    if (!name) return NextResponse.json({ error: "Department name is required" }, { status: 400 });

    const newDept = await prisma.department.create({
      data: {
        labId: user.labId,
        isGlobal: false, // Security: Force false so labs cannot alter the global platform catalog
        name: name.trim(),
        code: code ? code.trim().toUpperCase() : null
      }
    });

    return NextResponse.json({ success: true, department: newDept }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A department with this name already exists in your lab." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}

// 3. PUT: Update an existing Local Custom Department
export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, name, code } = await req.json();

    if (!id || !name) return NextResponse.json({ error: "ID and Name are required" }, { status: 400 });

    // SECURITY CHECK: Verify ownership and prevent editing global departments
    const existingDept = await prisma.department.findUnique({ where: { id } });
    
    if (!existingDept) return NextResponse.json({ error: "Department not found" }, { status: 404 });
    if (existingDept.isGlobal || existingDept.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden: Cannot edit global master departments" }, { status: 403 });
    }

    const updatedDept = await prisma.department.update({
      where: { id },
      data: {
        name: name.trim(),
        code: code ? code.trim().toUpperCase() : null
      }
    });

    return NextResponse.json({ success: true, department: updatedDept }, { status: 200 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A department with this name already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

// 4. DELETE: Remove a Local Custom Department
export async function DELETE(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Department ID is required" }, { status: 400 });

    // SECURITY CHECK: Verify ownership and prevent deleting global departments
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
    return NextResponse.json({ error: "Failed to delete department. It is likely currently attached to a test in your catalog." }, { status: 500 });
  }
}