import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getDataFromToken(req);
    if (!session || !session.userId || !session.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      baseAmount,
    } = await req.json();

    // 1. Fetch Secrets to verify signature
    const config = await prisma.systemConfig.findFirst();
    const key_secret = config?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!key_secret) {
      return NextResponse.json({ error: "Payment gateway misconfigured" }, { status: 500 });
    }

    // 2. Verify Razorpay Signature
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // 3. Update Wallet & Create Ledger Entry atomically
    await prisma.$transaction(async (tx) => {
      const wallet = await tx.labWallet.findUnique({ where: { labId: session.labId as string } });
      if (!wallet) throw new Error("Wallet not found");

      const newBalance = Number(wallet.balance) + Number(baseAmount);

      // Extend validity by 1 year from today
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      await tx.labWallet.update({
        where: { labId: session.labId as string },
        data: {
          balance: newBalance,
          validityEndDate: oneYearFromNow,
          isActive: true,
        },
      });

      await tx.walletTransaction.create({
        data: {
          labId: session.labId as string,
          type: "RECHARGE",
          amount: baseAmount,
          closingBalance: newBalance,
          description: `Wallet Recharge (Payment ID: ${razorpay_payment_id})`,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Payment Verification Error:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}