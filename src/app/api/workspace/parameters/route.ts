import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// ==========================================
// 1. GET: Fetch Parameters (Global + Local)
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parameters = await prisma.labTestParameter.findMany({
      where: {
        isActive: true, // ✅ Safely ignores soft-deleted items using schema-valid field
        OR: [
          { isGlobal: true },
          { labId: user.labId }
        ]
      },
      include: {
        // ✅ Strictly lowercase to match Prisma relation definitions
        containerType: {
          select: { code: true, capColor: true }
        },
        // Include reference ranges for use in results entry
        referenceRanges: true 
      },
      orderBy: [
        { isGlobal: 'desc' }, // Group Global items at the top
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ parameters }, { status: 200 });
  } catch (error) {
    console.error("Parameters Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ==========================================
// 2. POST: Create Local Parameter
// ==========================================
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, code, printName, unit, method, containerTypeId, isDerived, formula, decimals, price } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Name and Code are required" }, { status: 400 });
    }

    // Create a LOCAL custom parameter
    const newParameter = await prisma.labTestParameter.create({
      data: {
        labId: user.labId,
        isGlobal: false, 
        name: name.trim(),
        code: code.trim().toUpperCase(),
        printName: printName ? printName.trim() : null,
        unit: unit ? unit.trim() : null,
        method: method ? method.trim() : null,
        containerTypeId: containerTypeId || null,
        
        // Included additional optional fields mapped from schema
        isDerived: isDerived || false,
        formula: formula || null,
        decimals: decimals !== undefined ? parseInt(decimals) : 2,
        price: price !== undefined ? parseFloat(price) : 0,
        isActive: true
      }
    });

    return NextResponse.json({ success: true, parameter: newParameter }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A parameter with this code already exists in your lab." }, { status: 400 });
    }
    console.error("Parameter Create Error:", error);
    return NextResponse.json({ error: "Failed to create parameter" }, { status: 500 });
  }
}

// ==========================================
// 3. PUT: Update Local Parameter
// ==========================================
export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, name, printName, unit, method, containerTypeId, isDerived, formula, decimals, price, isActive } = body;

    if (!id) return NextResponse.json({ error: "Parameter ID is required" }, { status: 400 });

    const existingParam = await prisma.labTestParameter.findUnique({ where: { id } });

    if (!existingParam) return NextResponse.json({ error: "Parameter not found" }, { status: 404 });
    
    // STRICT CHECK: Prevent editing Global master parameters or other labs' parameters
    if (existingParam.isGlobal) return NextResponse.json({ error: "Cannot modify global master parameters." }, { status: 403 });
    if (existingParam.labId !== user.labId) return NextResponse.json({ error: "Unauthorized to edit this parameter." }, { status: 403 });

    const updatedParameter = await prisma.labTestParameter.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        printName: printName !== undefined ? printName.trim() : undefined,
        unit: unit !== undefined ? unit.trim() : undefined,
        method: method !== undefined ? method.trim() : undefined,
        containerTypeId: containerTypeId !== undefined ? containerTypeId : undefined,
        isDerived: isDerived !== undefined ? isDerived : undefined,
        formula: formula !== undefined ? formula : undefined,
        decimals: decimals !== undefined ? parseInt(decimals) : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      }
    });

    return NextResponse.json({ success: true, parameter: updatedParameter }, { status: 200 });
  } catch (error: any) {
    console.error("Parameter Update Error:", error);
    return NextResponse.json({ error: "Failed to update parameter" }, { status: 500 });
  }
}

// ==========================================
// 4. DELETE: Soft Delete Local Parameter
// ==========================================
export async function DELETE(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Parameter ID is required" }, { status: 400 });

    const parameter = await prisma.labTestParameter.findUnique({
      where: { id }
    });

    if (!parameter) {
      return NextResponse.json({ error: "Parameter not found" }, { status: 404 });
    }

    // STRICT CHECK: Prevent deleting Global master parameters or other labs' parameters
    if (parameter.isGlobal || parameter.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden: You cannot delete a global master parameter." }, { status: 403 });
    }

    // ✅ Enterprise Standard: Soft Delete (Using isActive since deletedAt is not in the schema)
    // If you hard-delete a parameter, it breaks the clinical history of any patient who had this parameter tested.
    await prisma.labTestParameter.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true, message: "Parameter archived successfully" }, { status: 200 });
  } catch (error) {
    console.error("Parameter Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete parameter." }, { status: 500 });
  }
}