import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const session = await getDataFromToken(req);
    if (!session?.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { baseAmount } = await req.json();
    if (!baseAmount || baseAmount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    // 1. SELF-HEALING: Ensure Wallet Exists
    const wallet = await prisma.labWallet.upsert({
      where: { labId: session.labId },
      update: {},
      create: {
        labId: session.labId,
        balance: 0,
        isActive: true,
      },
    });

    // 2. Fetch Config
    const config = await prisma.systemConfig.findFirst();
    const key_id = config?.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
    const key_secret = config?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) return NextResponse.json({ error: "Payment gateway misconfigured" }, { status: 500 });

    const razorpay = new Razorpay({ key_id, key_secret });
    const taxRate = Number(config?.taxRate || 18);
    const totalAmount = baseAmount + (baseAmount * (taxRate / 100));

    // 3. Create Order
    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `R_${session.labId.substring(0, 8)}_${Date.now()}`,
    });

    return NextResponse.json({
      orderId: order.id,
      keyId: key_id,
      totalAmount,
    });
  } catch (error) {
    console.error("Order Creation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}