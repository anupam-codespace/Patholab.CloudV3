import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch payments linked to the lab's subscription
    const payments = await prisma.payment.findMany({
      where: {
        subscription: {
          labId: user.labId
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
        razorpayPaymentId: true,
        invoiceId: true, // If you generate internal invoices for these payments
        subscription: {
          select: {
            plan: {
              select: { displayName: true }
            }
          }
        }
      }
    });

    return NextResponse.json({ payments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}