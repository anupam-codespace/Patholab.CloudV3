import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const labId = user.labId;

    const result = await prisma.$transaction(async (tx) => {
      let wallet = await tx.labWallet.findUnique({
        where: { labId: labId },
      });

      if (!wallet) {
        wallet = await tx.labWallet.create({
          data: {
            labId: labId,
            balance: 0,
            isActive: true,
          },
        });
      }

      const updatedWallet = await tx.labWallet.update({
        where: { labId: labId },
        data: {
          balance: {
            increment: 10000.00,
          },
          validityEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        },
      });

      await tx.walletTransaction.create({
        data: {
          labId: labId,
          type: "RECHARGE",
          amount: 10000.00,
          closingBalance: updatedWallet.balance,
          description: "Demo Testing Credits added by AI Assistant",
        },
      });

      return updatedWallet;
    });

    return NextResponse.json({ 
      success: true, 
      balance: Number(result.balance),
      message: "Successfully added ₹10,000.00 demo testing credits!" 
    });
  } catch (error: any) {
    console.error("Demo credits error:", error);
    return NextResponse.json({ error: error.message || "Failed to add demo credits" }, { status: 500 });
  }
}
