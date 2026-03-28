import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. Auth Check
    const user = await getCurrentUser();
    if (!user || !user.labId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = body;

    // 2. Signature Verification (Security First)
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 3. Prepare Data
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: "Invalid Plan" }, { status: 400 });

    const now = new Date();
    const endDate = new Date();
    
    // Calculate new expiry based on cycle
    if (plan.billingCycle === 'YEARLY') {
        endDate.setFullYear(now.getFullYear() + 1);
    } else {
        endDate.setMonth(now.getMonth() + 1);
    }

    // 4. DATABASE TRANSACTION
    // We use a transaction to ensure Invoice Numbering is atomic and safe
    await prisma.$transaction(async (tx) => {
        
        // A. Get & Increment Invoice Counter from SystemConfig
        let config = await tx.systemConfig.findFirst();
        
        // Create config if it doesn't exist yet
        if (!config) {
            config = await tx.systemConfig.create({ 
                data: { nextInvoiceNo: 1001, invoicePrefix: "SAAS" } 
            });
        }

        const nextNo = config.nextInvoiceNo;
        const prefix = config.invoicePrefix || "SAAS";
        const currentYear = new Date().getFullYear();
        
        // Format: SAAS-2024-1005
        const newInvoiceNumber = `${prefix}-${currentYear}-${nextNo}`;

        // Increment the counter for next time
        await tx.systemConfig.update({
            where: { id: config.id },
            data: { nextInvoiceNo: nextNo + 1 }
        });

        // B. Update Subscription (Upsert handles new or existing)
        const subscription = await tx.subscription.upsert({
            where: { labId: user.labId! },
            update: {
                planId,
                status: "ACTIVE",
                startDate: now,
                endDate: endDate,
            },
            create: {
                labId: user.labId!,
                planId,
                status: "ACTIVE",
                startDate: now,
                endDate: endDate,
            }
        });

        // C. Fetch Lab Details for Snapshot (Important for Taxes)
        const labDetails = await tx.lab.findUnique({
            where: { id: user.labId! },
            select: { name: true, address: true, city: true, state: true, pincode: true, gstNumber: true, email: true }
        });

        // D. Create Payment Record with Invoice Data
        await tx.payment.create({
            data: {
                subscriptionId: subscription.id,
                amount: plan.price * 1.18, // Storing Total Paid (Price + 18% GST)
                taxAmount: plan.price * 0.18, // Storing Tax Component separately
                status: "SUCCESS",
                
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                
                // ✅ SaaS Invoice Details
                invoiceNumber: newInvoiceNumber,
                invoiceDate: new Date(),
                
                // ✅ Billing Snapshot (Freezes details at time of purchase)
                billingSnapshot: {
                    labName: labDetails?.name,
                    billingAddress: `${labDetails?.address}, ${labDetails?.city}`,
                    state: labDetails?.state,
                    pincode: labDetails?.pincode,
                    gstNumber: labDetails?.gstNumber,
                    planName: plan.displayName,
                    billingCycle: plan.billingCycle
                }
            }
        });

        // E. Ensure User is Active (In case they were stuck in onboarding)
        await tx.user.update({
            where: { id: user.id },
            data: { 
                isActive: true,
                onboardingStatus: "COMPLETED" 
            }
        });
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Upgrade Verification Error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}