import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// ==========================================
// GET: Fetch Inventory Items with Batches
// ==========================================
export async function GET(req: NextRequest) {
  try {
    // 🔒 Replaced mock function with real Enterprise Auth
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await prisma.inventoryItem.findMany({
      where: { labId: user.labId },
      include: {
        batches: {
          where: { currentQuantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' }
        },
        // ✅ FIXED: Capital "S" to match the Prisma Schema exactly
        supplier: true 
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("Failed to fetch inventory items:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

// ==========================================
// POST: Create New Inventory Item
// ==========================================
export async function POST(req: NextRequest) {
  try {
    // 🔒 Replaced mock function with real Enterprise Auth
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, sku, category, purchaseUnit, usageUnit, conversionFactor, minStockLevel } = body;

    if (!name || !usageUnit) {
      return NextResponse.json({ error: "Name and Usage Unit are required." }, { status: 400 });
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        labId: user.labId,
        name: name.trim(),
        sku: sku ? sku.trim() : null,
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
    // Handle unique constraint error if item name/SKU already exists
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "An item with this name or SKU already exists in your lab." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}

export async function PUT(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params; // Next.js 15+ requirement
    const body = await request.json();
    
    // Ensure all fields are handled to avoid 'undefined' issues
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: id },
      data: {
        name: body.name,
        sku: body.sku || null,
        category: body.category || null,
        purchaseUnit: body.purchaseUnit,
        usageUnit: body.usageUnit,
        conversionFactor: parseFloat(body.conversionFactor),
        minStockLevel: parseFloat(body.minStockLevel),
      }
    });

    return NextResponse.json(updatedItem);
  } catch (error: any) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}