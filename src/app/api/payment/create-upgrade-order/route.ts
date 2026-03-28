import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { planId } = await req.json();
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    
    if (!plan) return NextResponse.json({ error: "Invalid Plan" }, { status: 400 });

    const amount = Math.round((plan.price * 1.18) * 100); // 18% GST in paise

    const order = await razorpay.orders.create({
      amount: amount,
      currency: "INR",
      receipt: `upgrade_${user.labId}`,
    });

    return NextResponse.json({ razorpayOrderId: order.id });
  } catch (error) {
    return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
  }
}