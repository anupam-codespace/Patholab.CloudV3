import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    // ✅ Extract MRP from body
    const { itemId, batchNumber, expiryDate, quantity, costPrice, mrp, location } = body;

    const parsedQuantity = parseFloat(quantity);
    const parsedCostPrice = costPrice ? parseFloat(costPrice) : null;
    // ✅ Parse MRP safely
    const parsedMrp = mrp ? parseFloat(mrp) : null;

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    const newBatch = await prisma.$transaction(async (tx) => {
      // 1. Create the Batch
      const batch = await tx.inventoryBatch.create({
        data: {
          labId: user.labId,
          itemId,
          batchNumber,
          expiryDate: new Date(expiryDate),
          initialQuantity: parsedQuantity,
          currentQuantity: parsedQuantity,
          costPrice: parsedCostPrice,
          mrp: parsedMrp, // ✅ Save to Database
          location: location || null,
        }
      });

      // 2. Log the Transaction for the Ledger
      await tx.inventoryTransaction.create({
        data: {
          batchId: batch.id,
          quantity: parsedQuantity,
          type: 'PURCHASE',
          notes: 'Initial stock receipt'
        }
      });

      return batch;
    });

    return NextResponse.json(newBatch, { status: 201 });

  } catch (error: any) {
    console.error("Batch Creation Error:", error);
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
  }
}