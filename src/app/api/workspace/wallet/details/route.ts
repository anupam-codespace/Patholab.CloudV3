import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken, getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userFromToken = await getDataFromToken(req);
    const currentUser = await getCurrentUser();
    const user = userFromToken || currentUser;

    let labId = user?.labId;
    if (!labId && user) {
      const uid = user.userId || user.id;
      if (uid) {
        const dbUser = await prisma.user.findUnique({
          where: { id: uid },
          include: {
            lab: true,
            staffLabs: { include: { lab: true } },
          },
        });
        const activeLab = dbUser?.lab || dbUser?.staffLabs?.[0]?.lab;
        if (activeLab) labId = activeLab.id;
      }
    }

    if (!labId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Extract Query Parameters for Pagination & Filtering
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "10"), 1),
      100,
    );
    const filterType = searchParams.get("type") || "ALL";
    const skip = (page - 1) * limit;

    // Build the dynamic WHERE clause for transactions
    const txWhere: any = { labId };
    if (filterType !== "ALL") {
      const upper = filterType.toUpperCase();
      if (upper === "DEBIT" || upper === "USAGE" || upper === "DEDUCTION") {
        txWhere.type = { in: ["DEDUCTION", "SETUP_FEE"] };
      } else if (upper === "RECHARGE" || upper === "CREDIT") {
        txWhere.type = { in: ["RECHARGE", "REFUND"] };
      } else {
        txWhere.type = filterType;
      }
    }

    // Date range filter if provided
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    if (startDate && endDate) {
      const from = new Date(startDate);
      const to = new Date(endDate);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return NextResponse.json(
          { error: "Invalid date range" },
          { status: 400 },
        );
      }

      to.setHours(23, 59, 59, 999);
      txWhere.createdAt = {
        gte: from,
        lte: to,
      };
    }

    // Ensure wallet exists for this lab
    let wallet = await prisma.labWallet.findUnique({
      where: { labId },
    });
    if (!wallet) {
      wallet = await prisma.labWallet.create({
        data: {
          labId,
          balance: 0,
          perPatientFee: 2.5,
        },
      });
    }

    // 2. Execute parallel DB queries for metrics and transactions
    const [rechargeAgg, spentAgg, transactions, totalTransactions] =
      await Promise.all([
        // Calculate Total Recharged
        prisma.walletTransaction.aggregate({
          where: {
            labId,
            type: { in: ["RECHARGE", "REFUND"] },
            createdAt: txWhere.createdAt,
          },
          _sum: { amount: true },
        }),
        // Calculate Total Spent
        prisma.walletTransaction.aggregate({
          where: {
            labId,
            type: { in: ["DEDUCTION", "SETUP_FEE"] },
            createdAt: txWhere.createdAt,
          },
          _sum: { amount: true },
        }),
        // Fetch Paginated Transactions
        prisma.walletTransaction.findMany({
          where: txWhere,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: skip,
        }),
        // Total count
        prisma.walletTransaction.count({
          where: txWhere,
        }),
      ]);

    // 3. Map transactions with numerical values and compatibility aliases
    const safeTransactions = transactions.map((tx) => {
      const amt = Number(tx.amount || 0);
      const cBal = Number(tx.closingBalance || 0);
      return {
        ...tx,
        amount: amt,
        closingBalance: cBal,
        balanceAfter: cBal, // Direct alias for mobile clients
        referenceId: tx.id,
      };
    });

    const totalRec = Number(rechargeAgg._sum.amount || 0);
    const totalSpent = Number(spentAgg._sum.amount || 0);

    // 4. Return structured payload
    return NextResponse.json({
      wallet: {
        ...wallet,
        balance: Number(wallet?.balance || 0),
        perPatientFee: Number(wallet?.perPatientFee || 2.5),
      },
      metrics: {
        totalRecharged: totalRec,
        totalSpent: totalSpent,
        calculatedBalance: totalRec - totalSpent,
      },
      transactions: safeTransactions,
      pagination: {
        total: totalTransactions,
        page,
        limit,
        totalPages: Math.ceil(totalTransactions / limit),
      },
    });
  } catch (error: any) {
    console.error("Wallet Fetch Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet data" },
      { status: 500 },
    );
  }
}
