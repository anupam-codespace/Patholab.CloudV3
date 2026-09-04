import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken, getCurrentUser } from "@/lib/auth";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const userFromToken = await getDataFromToken(req);
    const currentUser = await getCurrentUser();
    const session = userFromToken || currentUser;

    let labId = session?.labId;
    if (!labId && session) {
      const uid = session.userId || session.id;
      if (uid) {
        const dbUser = await prisma.user.findUnique({
          where: { id: uid },
          include: {
            lab: true,
            staffLabs: { include: { lab: true } },
          },
        });
        const activeLab = dbUser?.lab || dbUser?.staffLabs?.[0]?.lab;
        if (activeLab) labId = activeLab.id;
      }
    }

    if (!labId || !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { baseAmount } = await req.json();
    if (!baseAmount || baseAmount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    // 1. SELF-HEALING: Ensure Wallet Exists
    const wallet = await prisma.labWallet.upsert({
      where: { labId },
      update: {},
      create: {
        labId,
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
      receipt: `R_${labId.substring(0, 8)}_${Date.now()}`,
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