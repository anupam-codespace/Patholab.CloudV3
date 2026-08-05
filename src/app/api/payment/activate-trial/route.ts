import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto"; 
import { sendSlackAlert } from "@/lib/slack"; // ✅ Import Slack Helper

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, labId, planId } = body;

    if (!userId || !labId || !planId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch Plan details
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: "Invalid Plan" }, { status: 400 });

    if (plan.price > 0) {
      return NextResponse.json({ error: "This plan requires payment" }, { status: 400 });
    }

    // 2. Calculate Trial End Date (7 Days)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 7);

    // 3. DATABASE TRANSACTION
    // We capture the lab name to use in the slack alert later
    let activatedLabName = "Unknown Lab";

    await prisma.$transaction(async (tx) => {
        
        // A. Generate Invoice Number (Standardize with paid flow)
        let config = await tx.systemConfig.findFirst();
        if (!config) {
            config = await tx.systemConfig.create({ 
                data: { nextInvoiceNo: 1001, invoicePrefix: "SAAS" } 
            });
        }

        const nextNo = config.nextInvoiceNo;
        const prefix = config.invoicePrefix || "SAAS";
        const currentYear = new Date().getFullYear();
        const newInvoiceNumber = `${prefix}-${currentYear}-${nextNo}`;

        // Increment Counter
        await tx.systemConfig.update({
            where: { id: config.id },
            data: { nextInvoiceNo: nextNo + 1 }
        });

        // B. Create/Update Subscription
        const subscription = await tx.subscription.create({
            data: {
                labId,
                planId,
                status: "TRIAL", 
                startDate,
                endDate,
                // ✅ Initialize empty boosters for the new schema
                boosterTests: 0,
                boosterStorage: 0.0,
                boosterStaff: 0,
                boosterPatients: 0,
            },
        });
        
        // ✅ Initialize Usage Tracker (New Schema Requirement)
        await tx.currentUsage.create({
            data: {
                subscriptionId: subscription.id,
                testsUsed: 0,
                patientsCount: 0,
                staffCount: 1, // Count the owner
                storageUsedGB: 0.0
            }
        });

        // C. Fetch Lab Details for Invoice Snapshot
        const labDetails = await tx.lab.findUnique({
            where: { id: labId },
            select: { name: true, address: true, city: true, state: true, pincode: true, gstNumber: true, email: true }
        });
        
        if (labDetails?.name) activatedLabName = labDetails.name;

        // ✅ Generate Unique IDs
        const uniquePaymentId = `FREE_${Date.now()}_${randomUUID().split('-')[0]}`;
        const uniqueOrderId = `ORD_TRIAL_${Date.now()}`;

        // D. Create Zero-Value Payment Record (The Bill)
        await tx.payment.create({
            data: {
                subscriptionId: subscription.id,
                amount: 0, 
                taxAmount: 0,
                status: "SUCCESS",
                currency: "INR",
                
                // Invoice Details
                invoiceNumber: newInvoiceNumber,
                invoiceDate: new Date(),
                
                // ✅ UNIQUE IDs used here
                razorpayOrderId: uniqueOrderId, 
                razorpayPaymentId: uniquePaymentId, 
                
                // Snapshot for PDF
                billingSnapshot: {
                    labName: labDetails?.name,
                    billingAddress: `${labDetails?.address || ''}, ${labDetails?.city || ''}`,
                    state: labDetails?.state,
                    pincode: labDetails?.pincode,
                    gstNumber: labDetails?.gstNumber,
                    planName: `${plan.displayName} (Free Trial)`,
                    billingCycle: "7 Days"
                }
            }
        });

        // E. Activate User
        await tx.user.update({
            where: { id: userId },
            data: {
                isActive: true,
                onboardingStatus: "COMPLETED",
            },
        });
    });

    // ==========================================
    // 🔔 SLACK NOTIFICATION (Fire & Forget)
    // ==========================================
    const slackMsg = `
*🚀 New Free Trial Activated!*
--------------------------------
*Lab Name:* ${activatedLabName}
*Plan:* ${plan.displayName} (7 Days)
*User ID:* ${userId}
*Date:* ${new Date().toLocaleDateString('en-IN')}

_A new potential customer has started using the platform!_
`;
    
    // Send alert (async, non-blocking)
    sendSlackAlert(slackMsg, 'success');

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Trial Activation Error:", error);
    return NextResponse.json({ error: "Failed to activate trial" }, { status: 500 });
  }
}