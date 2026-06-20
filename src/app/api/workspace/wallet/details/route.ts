import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth"; 

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Secure Authentication
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch Wallet Details strictly for this Lab
    const wallet = await prisma.labWallet.findUnique({
      where: { labId: user.labId },
      include: {
        lab: { select: { name: true } },
      },
    });

    // Handle case where wallet doesn't exist yet (e.g., brand new lab)
    if (!wallet) {
      return NextResponse.json({
        wallet: {
          balance: 0,
          validityEndDate: null,
          isActive: false,
          isLisIntegrationPaid: false,
          perPatientFee: 2.50, // System default fallback
          minimumRecharge: 100.00, // System default fallback
          status: "NO_WALLET",
        },
        transactions: [],
      });
    }

    // 3. Fetch Transaction History (Increased to 50 for better ledger views)
    const transactions = await prisma.walletTransaction.findMany({
      where: { labId: user.labId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 4. Construct and Return Payload 
    // IMPORTANT: We nest the wallet details inside a `wallet` object 
    // to perfectly match the frontend's destructuring expectation!
    return NextResponse.json({
      wallet: {
        id: wallet.id,
        balance: Number(wallet.balance),
        validityEndDate: wallet.validityEndDate, // Real Date from DB
        isActive: wallet.isActive,
        isLisIntegrationPaid: wallet.isLisIntegrationPaid,
        perPatientFee: Number(wallet.perPatientFee), // Real Lab-Specific fee
        minimumRecharge: Number(wallet.minimumRecharge),
        labName: wallet.lab.name,
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        closingBalance: Number(t.closingBalance),
        description: t.description || `Wallet ${t.type}`,
        status: "SUCCESS",
        createdAt: t.createdAt,
      })),
    });

  } catch (error: any) {
    console.error("[WALLET_DETAILS_API_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}