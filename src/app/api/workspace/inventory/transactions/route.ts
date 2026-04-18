import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    // Fetch all transactions for batches belonging to this specific item
    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        batch: { itemId: itemId }
      },
      include: {
        batch: true, // Brings in batch number details
        test: { select: { testName: true, testNumber: true } } // Brings in the test details if it was consumed by a test
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 });
  }
}