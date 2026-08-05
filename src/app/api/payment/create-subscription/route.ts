import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Razorpay from 'razorpay';
import { sendSlackAlert } from '@/lib/slack'; // ✅ Import Slack Helper

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { planId, userId } = await req.json();

    if (!planId || !userId) {
      return NextResponse.json({ error: 'Missing planId or userId' }, { status: 400 });
    }

    // 1. Get Plan Details
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    
    if (!plan || !plan.razorpayId) {
      return NextResponse.json({ error: 'Plan not configured for payments' }, { status: 400 });
    }

    // 2. Get User Details (For the notification)
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { lab: { select: { name: true } } }
    });

    // 3. Create Subscription on Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.razorpayId,
      total_count: 120, // 10 years (indefinite)
      quantity: 1,
      customer_notify: 1,
      notes: { userId: userId, internalPlanId: planId }
    });

    // ==========================================
    // 🔔 SLACK NOTIFICATION (Checkout Initiated)
    // ==========================================
    const slackMsg = `
*💳 New Checkout Initiated!*
--------------------------------
*User:* ${user?.name || 'Unknown'}
*Lab:* ${user?.lab?.name || 'N/A'}
*Plan:* ${plan.displayName} (₹${plan.price})
*Status:* Pending Payment...

_User is at the payment gateway._
`;

    sendSlackAlert(slackMsg, 'info');

    return NextResponse.json({ 
      subscriptionId: subscription.id,
      key: process.env.RAZORPAY_KEY_ID 
    });

  } catch (error: any) {
    console.error('Razorpay Error:', error);
    return NextResponse.json({ error: error.description || 'Failed to create subscription' }, { status: 500 });
  }
}