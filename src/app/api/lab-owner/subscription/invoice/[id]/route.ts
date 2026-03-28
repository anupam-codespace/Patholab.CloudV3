import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user?.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Fetch the Payment (Invoice)
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        subscription: {
          include: {
            plan: true,
            lab: { 
              // Fetch Lab details for "Bill To"
              select: {
                name: true,
                address: true,
                city: true,
                state: true,
                pincode: true,
                email: true,
                gstNumber: true
              }
            }
          }
        }
      }
    });

    if (!payment) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // Security: Ensure this invoice belongs to the requesting lab
    if (payment.subscription.labId !== user.labId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Fetch System Config (Your SaaS Company Details for "Bill From")
    const systemConfig = await prisma.systemConfig.findFirst();

    // 3. Return Combined Data
    return NextResponse.json({
      ...payment,
      providerDetails: systemConfig // This attaches your config to the response
    });

  } catch (error) {
    console.error("Invoice API Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}