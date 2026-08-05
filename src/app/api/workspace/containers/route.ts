import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// 1. GET: Fetch Global Master + Local Custom Containers
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const containers = await prisma.containerType.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { labId: user.labId }
        ]
      },
      orderBy: [
        { isGlobal: 'desc' }, // Group global master items at the top
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ containers }, { status: 200 });
  } catch (error) {
    console.error("Containers Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 2. POST: Create a new Local Custom Container
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, code, capColor } = await req.json();

    if (!name || !code) {
      return NextResponse.json({ error: "Container name and code are required" }, { status: 400 });
    }

    const newContainer = await prisma.containerType.create({
      data: {
        labId: user.labId,
        isGlobal: false, // Security: Prevent labs from creating global platform data
        name: name.trim(),
        code: code.trim().toUpperCase(),
        capColor: capColor ? capColor.trim() : null
      }
    });

    return NextResponse.json({ success: true, container: newContainer }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A container with this name already exists in your lab." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create container" }, { status: 500 });
  }
}

// 3. PUT: Update an existing Local Custom Container
export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, name, code, capColor } = await req.json();

    if (!id || !name || !code) {
      return NextResponse.json({ error: "ID, Name, and Code are required" }, { status: 400 });
    }

    // SECURITY CHECK: Verify ownership and prevent editing global containers
    const existingContainer = await prisma.containerType.findUnique({ where: { id } });
    
    if (!existingContainer) return NextResponse.json({ error: "Container not found" }, { status: 404 });
    if (existingContainer.isGlobal || existingContainer.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden: Cannot edit global master containers" }, { status: 403 });
    }

    const updatedContainer = await prisma.containerType.update({
      where: { id },
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        capColor: capColor ? capColor.trim() : null
      }
    });

    return NextResponse.json({ success: true, container: updatedContainer }, { status: 200 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A container with this name already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update container" }, { status: 500 });
  }
}

// 4. DELETE: Remove a Local Custom Container
export async function DELETE(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Container ID is required" }, { status: 400 });

    // SECURITY CHECK: Verify ownership and prevent deleting global containers
    const existingContainer = await prisma.containerType.findUnique({ where: { id } });
    
    if (!existingContainer) return NextResponse.json({ error: "Container not found" }, { status: 404 });
    if (existingContainer.isGlobal || existingContainer.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden: Cannot delete global master containers" }, { status: 403 });
    }

    await prisma.containerType.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Container deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete Container Error:", error);
    return NextResponse.json({ error: "Failed to delete container. It is likely currently attached to a test parameter." }, { status: 500 });
  }
}