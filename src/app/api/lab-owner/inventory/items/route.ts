import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Helper to get the Lab ID (Replace with your actual Auth logic later)
async function getLabId() {
  // Try to find the first available lab in the database for testing
  const lab = await prisma.lab.findFirst();
  return lab?.id;
}

export async function GET(req: Request) {
  try {
    const labId = await getLabId();
    if (!labId) return NextResponse.json({ error: "No Lab found in database" }, { status: 400 });

    const items = await prisma.inventoryItem.findMany({
      where: { labId },
      include: {
        batches: {
          where: { currentQuantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' }
        },
        supplier: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Failed to fetch inventory items:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const labId = await getLabId();
    if (!labId) return NextResponse.json({ error: "No Lab found in database" }, { status: 400 });

    const body = await req.json();
    const { name, sku, category, purchaseUnit, usageUnit, conversionFactor, minStockLevel } = body;

    if (!name || !usageUnit) {
      return NextResponse.json({ error: "Name and Usage Unit are required." }, { status: 400 });
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        labId,
        name,
        sku: sku || null,
        category: category || null,
        purchaseUnit: purchaseUnit || "Box",
        usageUnit: usageUnit || "ml",
        conversionFactor: parseFloat(conversionFactor) || 1,
        minStockLevel: parseInt(minStockLevel) || 10,
      }
    });

    return NextResponse.json(newItem);
  } catch (error: any) {
    console.error("Failed to create inventory item:", error);
    // Handle unique constraint error if item name already exists
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "An item with this name already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}