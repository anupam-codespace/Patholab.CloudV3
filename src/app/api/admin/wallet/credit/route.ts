import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate and Verify Super Admin Status
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: No token provided" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch (err) {
      return NextResponse.json({ message: "Session expired. Please log in again." }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true },
    });

    if (!adminUser || adminUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden: Super Admin access required" }, { status: 403 });
    }

    // 2. Parse and Validate Request Body
    const body = await req.json();
    const { labId, amount, paymentMethod, reference, notes } = body;

    if (!labId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ message: "Invalid payload: Valid labId and positive amount are required" }, { status: 400 });
    }

    // 3. Execute Atomic Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      
      // Step A: Find the target Lab's Wallet (Using exact schema name: labWallet)
      let targetWallet = await tx.labWallet.findUnique({
        where: { labId: labId },
      });

      // Step B: If the lab doesn't have a wallet yet, create it instantly
      if (!targetWallet) {
        targetWallet = await tx.labWallet.create({
          data: {
            labId: labId,
            balance: 0,
            isActive: true, // Schema expects boolean isActive
          },
        });
      }

      // Define standard 1-year validity extension for credits
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      // Step C: Update Wallet Balance and Validity
      const updatedWallet = await tx.labWallet.update({
        where: { id: targetWallet.id },
        data: {
          balance: { increment: Number(amount) },
          validityEndDate: oneYearFromNow,
          isActive: true, 
        },
      });

      // Step D: Construct the receipt description
      // Since your schema only has a 'description' field, we combine the metadata here.
      const descParts = [`Patholab.cloud Credit`];
      if (paymentMethod) descParts.push(`Via: ${paymentMethod}`);
      if (reference) descParts.push(`Ref: ${reference}`);
      if (notes) descParts.push(`Note: ${notes}`);

      // Step E: Generate the WalletTransaction Receipt (Using exact schema name: walletTransaction)
      const transactionRecord = await tx.walletTransaction.create({
        data: {
          labId: targetWallet.labId,
          amount: Number(amount),
          closingBalance: updatedWallet.balance, // Required field in your schema
          type: "RECHARGE", // Must match your TransactionType Enum
          description: descParts.join(" | "), 
        },
      });

      return { updatedWallet, transactionRecord };
    });

    // 4. Return Success
    return NextResponse.json({
      message: "Wallet successfully credited",
      balance: result.updatedWallet.balance,
      transactionId: result.transactionRecord.id,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Super Admin Wallet Credit Error:", error);
    return NextResponse.json(
      { message: "Failed to credit wallet. Please ensure your database schema is synced.", error: error.message }, 
      { status: 500 }
    );
  }
}