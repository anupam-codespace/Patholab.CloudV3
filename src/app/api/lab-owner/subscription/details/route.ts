import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Fetch Subscription, Plan, and Real-time Usage
    const subscription = await prisma.subscription.findUnique({
      where: { labId: user.labId },
      include: { 
        plan: true,
        currentUsage: true // ✅ Fetch real-time usage tracker
      },
    });

    // Handle no subscription case
    if (!subscription) {
      return NextResponse.json({ 
        currentPlan: null, 
        usage: { 
          tests: 0, limitTests: 0, 
          patients: 0, limitPatients: 0,
          boostersActive: false 
        },
        payments: [] 
      });
    }

    // 2. Fetch Payment History (Include Add-ons)
    const payments = await prisma.payment.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        razorpayPaymentId: true,
        invoiceNumber: true,
        // ✅ Fetch Add-on details if this was a booster purchase
        addOn: {
          select: { name: true, type: true }
        },
        subscription: {
          select: {
            plan: {
              select: { displayName: true }
            }
          }
        }
      }
    });

    // 3. Calculate Limits (Plan + Booster + Bonus)
    const plan = subscription.plan;
    
    // Tests Limit
    const baseTestLimit = plan.maxTestsPerMonth;
    const totalTestLimit = baseTestLimit === -1 
      ? -1 
      : baseTestLimit + subscription.boosterTests + subscription.bonusTests;

    // Patients Limit
    const basePatientLimit = plan.maxPatientsTotal;
    const totalPatientLimit = basePatientLimit === -1 
      ? -1 
      : basePatientLimit + subscription.boosterPatients; // Assuming no bonus field for patients, just boosters

    // 4. Fetch Available Plans
    const availablePlans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });

    return NextResponse.json({
      currentPlan: {
        id: plan.id,
        name: plan.displayName,
        price: plan.price,
        status: subscription.status,
        billingCycle: plan.billingCycle,
        endDate: subscription.endDate,
        // Flags
        hasInventory: plan.hasInventory,
        hasWhatsapp: plan.hasWhatsapp
      },
      usage: {
        // Tests
        tests: subscription.currentUsage?.testsUsed || 0,
        limitTests: totalTestLimit,
        boosterTests: subscription.boosterTests, // To show "+50" in UI
        
        // Patients
        patients: subscription.currentUsage?.patientsCount || 0,
        limitPatients: totalPatientLimit,
        
        // Storage
        storageUsed: subscription.currentUsage?.storageUsedGB || 0,
        limitStorage: plan.maxStorageGB + subscription.boosterStorage + subscription.bonusStorage,
      },
      availablePlans,
      payments,
    });

  } catch (error) {
    console.error("Subscription API Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}