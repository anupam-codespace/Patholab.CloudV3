import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// 1. GET: Fetch Global Master + Local Custom Samples
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const samples = await prisma.sampleType.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { labId: user.labId }
        ]
      },
      orderBy: [
        { isGlobal: 'desc' }, // Keep global items at the top of the list
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ samples }, { status: 200 });
  } catch (error) {
    console.error("Samples Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 2. POST: Create a new Local Custom Sample
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, code } = await req.json();

    if (!name) return NextResponse.json({ error: "Sample name is required" }, { status: 400 });

    const newSample = await prisma.sampleType.create({
      data: {
        labId: user.labId,
        isGlobal: false, // Force false so labs can't create global data
        name: name.trim(),
        code: code ? code.trim().toUpperCase() : null
      }
    });

    return NextResponse.json({ success: true, sample: newSample }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A sample type with this name already exists in your lab." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create sample type" }, { status: 500 });
  }
}

// 3. PUT: Update an existing Local Custom Sample
export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, name, code } = await req.json();

    if (!id || !name) return NextResponse.json({ error: "ID and Name are required" }, { status: 400 });

    // SECURITY CHECK: Verify ownership and prevent editing global samples
    const existingSample = await prisma.sampleType.findUnique({ where: { id } });
    
    if (!existingSample) return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    if (existingSample.isGlobal || existingSample.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden: Cannot edit global master sample types" }, { status: 403 });
    }

    const updatedSample = await prisma.sampleType.update({
      where: { id },
      data: {
        name: name.trim(),
        code: code ? code.trim().toUpperCase() : null
      }
    });

    return NextResponse.json({ success: true, sample: updatedSample }, { status: 200 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A sample type with this name already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update sample type" }, { status: 500 });
  }
}

// 4. DELETE: Remove a Local Custom Sample
export async function DELETE(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Sample ID is required" }, { status: 400 });

    // SECURITY CHECK: Verify ownership and prevent deleting global samples
    const existingSample = await prisma.sampleType.findUnique({ where: { id } });
    
    if (!existingSample) return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    if (existingSample.isGlobal || existingSample.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden: Cannot delete global master sample types" }, { status: 403 });
    }

    await prisma.sampleType.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Sample deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete Sample Error:", error);
    return NextResponse.json({ error: "Failed to delete sample. It may be linked to existing tests." }, { status: 500 });
  }
}