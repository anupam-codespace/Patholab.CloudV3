import { NextResponse } from "next/server";
import {prisma} from "@/lib/prisma";

// UPDATE ITEM
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const itemId = params.id;
    const body = await req.json();
    const { name, sku, category, purchaseUnit, usageUnit, conversionFactor, minStockLevel } = body;

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        name,
        sku: sku || null,
        category: category || null,
        purchaseUnit: purchaseUnit || "Box",
        usageUnit: usageUnit || "ml",
        conversionFactor: parseFloat(conversionFactor) || 1,
        minStockLevel: parseInt(minStockLevel) || 10,
      }
    });

    return NextResponse.json(updatedItem);
  } catch (error: any) {
    console.error("Failed to update item:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "An item with this name already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

// DELETE ITEM
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const itemId = params.id;

    // Because of onDelete: Cascade in Prisma, this will also automatically 
    // delete all associated Batches and Ledger Transactions for this item.
    await prisma.inventoryItem.delete({
      where: { id: itemId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete item:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}