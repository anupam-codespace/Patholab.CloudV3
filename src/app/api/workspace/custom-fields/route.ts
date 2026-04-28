import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// 1. GET: Fetch Local Custom Fields for this Lab
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const customFields = await prisma.customFieldDefinition.findMany({
      where: {
        labId: user.labId // Strictly scoped to this lab
      },
      orderBy: { 
        name: 'asc' 
      }
    });

    return NextResponse.json({ customFields }, { status: 200 });
  } catch (error) {
    console.error("Custom Fields Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 2. POST: Create a new Custom Field
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, type, options, reportLayout, printOnReport } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Field name and type are required" }, { status: 400 });
    }

    const newField = await prisma.customFieldDefinition.create({
      data: {
        labId: user.labId,
        name: name.trim(),
        type: type,
        options: options || [], // Array of strings for Dropdowns
        reportLayout: reportLayout || "FULL",
        printOnReport: printOnReport !== undefined ? printOnReport : true
      }
    });

    return NextResponse.json({ success: true, customField: newField }, { status: 201 });
  } catch (error: any) {
    // Handle Prisma's Unique Constraint Error (@@unique([labId, name]))
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A custom field with this name already exists in your lab." }, { status: 400 });
    }
    console.error("Custom Field Create Error:", error);
    return NextResponse.json({ error: "Failed to create custom field" }, { status: 500 });
  }
}

// 3. PUT: Update an existing Custom Field
export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, name, type, options, reportLayout, printOnReport } = body;

    if (!id || !name || !type) {
      return NextResponse.json({ error: "ID, Name, and Type are required" }, { status: 400 });
    }

    // SECURITY CHECK: Verify ownership
    const existingField = await prisma.customFieldDefinition.findUnique({ where: { id } });
    
    if (!existingField) return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    if (existingField.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden: You do not own this custom field" }, { status: 403 });
    }

    const updatedField = await prisma.customFieldDefinition.update({
      where: { id },
      data: {
        name: name.trim(),
        type: type,
        options: options || [],
        reportLayout: reportLayout || "FULL",
        printOnReport: printOnReport !== undefined ? printOnReport : true
      }
    });

    return NextResponse.json({ success: true, customField: updatedField }, { status: 200 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A custom field with this name already exists." }, { status: 400 });
    }
    console.error("Custom Field Update Error:", error);
    return NextResponse.json({ error: "Failed to update custom field" }, { status: 500 });
  }
}

// 4. DELETE: Remove a Custom Field
export async function DELETE(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Field ID is required" }, { status: 400 });

    // SECURITY CHECK: Verify ownership
    const existingField = await prisma.customFieldDefinition.findUnique({ where: { id } });
    
    if (!existingField) return NextResponse.json({ error: "Custom field not found" }, { status: 404 });
    if (existingField.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden: You do not own this custom field" }, { status: 403 });
    }

    await prisma.customFieldDefinition.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Custom field deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete Custom Field Error:", error);
    return NextResponse.json({ error: "Failed to delete custom field. It is likely currently attached to a test template." }, { status: 500 });
  }
}