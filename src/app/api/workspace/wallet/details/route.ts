import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth"; // Adjust this import if your auth helper path is different

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const user = await getDataFromToken(req);
    if (!user || !user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch User & Determine Active Lab
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      include: {
        lab: true, // If user is LAB_OWNER
        staffLabs: { include: { lab: true } }, // If user is LAB_STAFF
      },
    });

    const activeLab = dbUser?.lab || dbUser?.staffLabs[0]?.lab;
    
    if (!activeLab) {
      return NextResponse.json({ error: "Lab not found" }, { status: 404 });
    }

    // 3. Fetch Wallet Details (Fixed Schema Selection)
    const wallet = await prisma.labWallet.findUnique({
      where: { labId: activeLab.id },
      include: {
        // Only fetch the name from the Lab model.
        // isLisIntegrationPaid is now correctly located on the LabWallet model.
        lab: { select: { name: true } },
      },
    });

    // Handle case where wallet doesn't exist yet (e.g., brand new lab)
    if (!wallet) {
      return NextResponse.json({
        balance: 0,
        validityEndDate: null,
        transactions: [],
        status: "NO_WALLET",
      });
    }

    // 4. Fetch Transaction History (Last 20)
    const transactions = await prisma.walletTransaction.findMany({
      where: { labId: activeLab.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 5. Construct and Return Payload
    // Note: We format Decimal objects to Numbers here to prevent Next.js serialization errors
    return NextResponse.json({
      balance: Number(wallet.balance),
      validityEndDate: wallet.validityEndDate, // This is the real Date from DB
      isActive: wallet.isActive,
      isLisIntegrationPaid: wallet.isLisIntegrationPaid, // Now pulled correctly from wallet
      perPatientFee: Number(wallet.perPatientFee), // This is the real Lab-Specific fee
      minimumRecharge: Number(wallet.minimumRecharge),
      labName: wallet.lab.name,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        closingBalance: Number(t.closingBalance),
        description: t.description || `Wallet ${t.type}`,
        status: "SUCCESS", // Mapped for frontend UI badges
        createdAt: t.createdAt,
      })),
    });

  } catch (error: any) {
    console.error("Wallet Details API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}