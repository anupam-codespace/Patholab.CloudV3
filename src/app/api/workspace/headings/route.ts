import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// 1. GET: Fetch Global Master + Local Custom Headings
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const headings = await prisma.testHeading.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { labId: user.labId }
        ]
      },
      orderBy: [
        { isGlobal: 'desc' }, // Group global items at the top of the list
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ headings }, { status: 200 });
  } catch (error) {
    console.error("Headings Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 2. POST: Create a new Local Custom Heading
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name } = await req.json();

    if (!name) return NextResponse.json({ error: "Heading name is required" }, { status: 400 });

    const newHeading = await prisma.testHeading.create({
      data: {
        labId: user.labId,
        isGlobal: false, // Security: Force false so labs can't create global data
        name: name.trim().toUpperCase() // Convention: Headings are usually uppercase
      }
    });

    return NextResponse.json({ success: true, heading: newHeading }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A heading with this name already exists in your lab." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create heading" }, { status: 500 });
  }
}

// 3. PUT: Update an existing Local Custom Heading
export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, name } = await req.json();

    if (!id || !name) return NextResponse.json({ error: "ID and Name are required" }, { status: 400 });

    // SECURITY CHECK: Verify ownership and prevent editing global headings
    const existingHeading = await prisma.testHeading.findUnique({ where: { id } });
    
    if (!existingHeading) return NextResponse.json({ error: "Heading not found" }, { status: 404 });
    if (existingHeading.isGlobal || existingHeading.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden: Cannot edit global master headings" }, { status: 403 });
    }

    const updatedHeading = await prisma.testHeading.update({
      where: { id },
      data: {
        name: name.trim().toUpperCase()
      }
    });

    return NextResponse.json({ success: true, heading: updatedHeading }, { status: 200 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A heading with this name already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update heading" }, { status: 500 });
  }
}

// 4. DELETE: Remove a Local Custom Heading
export async function DELETE(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Heading ID is required" }, { status: 400 });

    // SECURITY CHECK: Verify ownership and prevent deleting global headings
    const existingHeading = await prisma.testHeading.findUnique({ where: { id } });
    
    if (!existingHeading) return NextResponse.json({ error: "Heading not found" }, { status: 404 });
    if (existingHeading.isGlobal || existingHeading.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden: Cannot delete global master headings" }, { status: 403 });
    }

    await prisma.testHeading.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Heading deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete Heading Error:", error);
    return NextResponse.json({ error: "Failed to delete heading. It may be currently used inside a test template." }, { status: 500 });
  }
}