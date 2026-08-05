import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const session = await getDataFromToken(req);
    if (!session || !session.userId || !session.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { baseAmount } = await req.json();
    if (!baseAmount || baseAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // 1. Fetch Platform Keys from SystemConfig or ENV
    const config = await prisma.systemConfig.findFirst();
    const key_id = config?.razorpayKeyId || process.env.RAZORPAY_KEY_ID;
    const key_secret = config?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    const razorpay = new Razorpay({ key_id, key_secret });

    // 2. Calculate GST (18%)
    const taxRate = Number(config?.taxRate || 18);
    const gstAmount = baseAmount * (taxRate / 100);
    const totalAmount = baseAmount + gstAmount;

    // Razorpay requires amount in paise (multiply by 100)
    const amountInPaise = Math.round(totalAmount * 100);

    // 3. Create a short receipt ID (Max 40 chars)
    // Extract first 8 chars of Lab UUID + timestamp (e.g., "R_550e8400_1718100000000" = 23 chars)
    const shortLabId = session.labId.substring(0, 8);
    const safeReceipt = `R_${shortLabId}_${Date.now()}`;

    // 4. Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: safeReceipt, // <= FIXED HERE
    });

    return NextResponse.json({
      orderId: order.id,
      keyId: key_id,
      baseAmount,
      gstAmount,
      totalAmount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}