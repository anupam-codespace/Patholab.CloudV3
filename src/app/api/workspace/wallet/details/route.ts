import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth"; // Assuming this is your auth method from context

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
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
    const labId = user.labId;

    // Build the dynamic WHERE clause for transactions
    const txWhere: any = { labId };
    if (filterType !== "ALL") {
      txWhere.type = filterType;
    }

    // 1. Add Date extraction
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 2. Add the date filter to your transaction WHERE clause

    // -> NEW: Apply date range if provided
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

    // 2. Execute parallel DB queries for maximum speed
    const [wallet, rechargeAgg, spentAgg, transactions, totalTransactions] =
      await Promise.all([
        // A. Get the core wallet data
        prisma.labWallet.findUnique({
          where: { labId },
        }),
        // B. Calculate Total Recharged (DB Level Math)
        prisma.walletTransaction.aggregate({
          where: {
            labId,
            type: { in: ["RECHARGE", "REFUND"] },
            createdAt: txWhere.createdAt,
          },
          _sum: { amount: true },
        }),
        // C. Calculate Total Spent (DB Level Math)
        prisma.walletTransaction.aggregate({
          where: {
            labId,
            type: { in: ["DEDUCTION", "SETUP_FEE"] },
            createdAt: txWhere.createdAt,
          },
          _sum: { amount: true },
        }),
        // D. Fetch Paginated Transactions
        prisma.walletTransaction.findMany({
          where: txWhere,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: skip,
        }),
        // E. Get total count for pagination math
        prisma.walletTransaction.count({
          where: txWhere,
        }),
      ]);

    // 3. Prevent the Next.js "Decimal Warning" by mapping to numbers
    const safeTransactions = transactions.map((tx) => ({
      ...tx,
      amount: Number(tx.amount),
      closingBalance: Number(tx.closingBalance),
    }));

    // 4. Return structured, sanitized payload
    return NextResponse.json({
      
      wallet: {
        
        ...wallet,
        balance: Number(wallet?.balance || 0),
        perPatientFee: Number(wallet?.perPatientFee || 0),
      },
      metrics: {
        totalRecharged: Number(rechargeAgg._sum.amount || 0),
        totalSpent: Number(spentAgg._sum.amount || 0),
        calculatedBalance:
          Number(rechargeAgg._sum.amount || 0) -
          Number(spentAgg._sum.amount || 0),
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
