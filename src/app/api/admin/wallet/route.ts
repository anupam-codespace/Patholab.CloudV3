import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth"; // Adjust to your auth path

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Secure Authentication - MUST be Super Admin
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized - Super Admin Only" }, { status: 401 });
    }

    // 2. Fetch All Wallets with Lab Info
    const wallets = await prisma.labWallet.findMany({
      include: {
        lab: {
          select: { name: true, phone: true, email: true },
        },
      },
      orderBy: { balance: 'desc' } // Show highest balances first
    });

    // 3. Calculate Platform-Level KPIs
    const totalLiability = wallets.reduce((acc, w) => acc + Number(w.balance), 0);
    const lowBalanceCount = wallets.filter(w => Number(w.balance) < 500).length;

    // 4. Format the output safely (Prisma Decimals to Numbers)
    const formattedWallets = wallets.map(w => ({
      id: w.id,
      labId: w.labId,
      labName: w.lab?.name || "Unknown Lab",
      phone: w.lab?.phone || "N/A",
      email: w.lab?.email || "N/A",
      balance: Number(w.balance),
      perPatientFee: Number(w.perPatientFee),
      isActive: w.isActive,
      validityEndDate: w.validityEndDate,
    }));

    return NextResponse.json({
      stats: {
        totalLiability,
        totalWallets: wallets.length,
        lowBalanceCount
      },
      wallets: formattedWallets
    }, { status: 200 });

  } catch (error) {
    console.error("[ADMIN_WALLET_LEDGER_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}