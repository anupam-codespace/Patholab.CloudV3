import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch BOTH Global parameters and Local custom parameters
    const parameters = await prisma.labTestParameter.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { labId: user.labId }
        ]
      },
      include: {
        // Include relations needed by the UI
        containerType: {
          select: { code: true, capColor: true }
        },
        reagents: {
          include: {
            inventoryItem: {
              select: { name: true, usageUnit: true }
            }
          }
        }
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

export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, code, printName, unit, inputType, price, containerTypeId } = body;

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
        inputType: inputType || "NUMBER",
        price: price ? parseFloat(price) : 0,
        containerTypeId: containerTypeId || null,
        isActive: true,
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

export async function DELETE(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Parameter ID is required" }, { status: 400 });

    // Security Check: Verify the parameter exists AND belongs to this lab
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

    // Delete the parameter
    await prisma.labTestParameter.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Parameter deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Parameter Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete parameter. It may be currently used in a test." }, { status: 500 });
  }
}