import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// UPDATE BATCH (Existing)
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const batchId = params.id;
    const body = await req.json();
    const { currentQuantity, expiryDate, location } = body;

    const oldBatch = await prisma.inventoryBatch.findUnique({
      where: { id: batchId }
    });

    if (!oldBatch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

    const newQuantity = parseFloat(currentQuantity);
    const quantityDifference = newQuantity - oldBatch.currentQuantity;

    const updatedBatch = await prisma.$transaction(async (tx) => {
      const batch = await tx.inventoryBatch.update({
        where: { id: batchId },
        data: {
          currentQuantity: newQuantity,
          expiryDate: new Date(expiryDate),
          location: location || null
        }
      });

      if (quantityDifference !== 0) {
        await tx.inventoryTransaction.create({
          data: {
            batchId: batch.id,
            quantity: quantityDifference, 
            type: "ADJUSTMENT",
            notes: "Manual adjustment via inventory dashboard",
          }
        });
      }
      return batch;
    });

    return NextResponse.json(updatedBatch);
  } catch (error: any) {
    console.error("Failed to update batch:", error);
    return NextResponse.json({ error: "Failed to update batch" }, { status: 500 });
  }
}

// DELETE BATCH (NEW)
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const batchId = params.id;

    // This will cascade and delete all related ledger transactions for this batch
    await prisma.inventoryBatch.delete({
      where: { id: batchId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete batch:", error);
    return NextResponse.json({ error: "Failed to delete batch" }, { status: 500 });
  }
}