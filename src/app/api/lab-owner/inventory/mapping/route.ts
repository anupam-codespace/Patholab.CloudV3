import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Fetch existing mappings for a specific parameter
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parameterId = searchParams.get("parameterId");

    if (!parameterId) {
      return NextResponse.json({ error: "Parameter ID is required" }, { status: 400 });
    }

    const mappings = await prisma.testParameterReagent.findMany({
      where: { parameterId },
      include: {
        inventoryItem: true // Brings back the name and units of the item
      }
    });

    return NextResponse.json(mappings);
  } catch (error) {
    console.error("Failed to fetch reagent mappings:", error);
    return NextResponse.json({ error: "Failed to fetch mappings" }, { status: 500 });
  }
}

// Add a new reagent mapping to a parameter
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { parameterId, inventoryItemId, quantity } = body;

    if (!parameterId || !inventoryItemId || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const mapping = await prisma.testParameterReagent.create({
      data: {
        parameterId,
        inventoryItemId,
        quantity: parseFloat(quantity)
      },
      include: {
        inventoryItem: true
      }
    });

    return NextResponse.json(mapping);
  } catch (error: any) {
    console.error("Failed to map reagent:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "This reagent is already mapped to this parameter." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to map reagent" }, { status: 500 });
  }
}

// Remove a mapping
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mappingId = searchParams.get("id");

    if (!mappingId) return NextResponse.json({ error: "Mapping ID required" }, { status: 400 });

    await prisma.testParameterReagent.delete({
      where: { id: mappingId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete mapping" }, { status: 500 });
  }
}