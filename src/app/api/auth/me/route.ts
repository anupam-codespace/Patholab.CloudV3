import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth"; // Adjust if your token helper is named differently

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Session Token
    const session = await getDataFromToken(req);
    const userId = session?.userId || (session as any)?.id;
    if (!session || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch User with Enterprise RBAC & Wallet Context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        // A. If LAB_OWNER, get their direct lab & wallet
        lab: {
          include: {
            wallet: true,
            branches: { where: { isMainBranch: true } },
          },
        },
        // B. If STAFF, get their active assignments
        staffLabs: {
          where: { isActive: true },
          include: {
            lab: { include: { wallet: true } },
            branch: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Resolve Lab, Branch, and Permissions Safely
    let activeLab = null;
    let activeBranch = null;
    let permissions: string[] = [];

    if (user.role === "SUPER_ADMIN") {
      activeLab = await prisma.lab.findFirst({
        where: { isActive: true },
        include: {
          wallet: true,
          branches: { where: { isMainBranch: true } },
        },
      });
      activeBranch = activeLab?.branches?.[0] || null;
      permissions = ["ALL"];
    } else if (user.role === "LAB_OWNER") {
      activeLab = user.lab || user.staffLabs?.[0]?.lab || null;
      activeBranch = user.lab?.branches?.[0] || user.staffLabs?.[0]?.branch || null;
      permissions = ["ALL"]; // Owners have unrestricted access to their lab
    } else if (user.role !== "PATIENT") {
      const primaryProfile = user.staffLabs[0];
      activeLab = primaryProfile?.lab || null;
      activeBranch = primaryProfile?.branch || null;
      permissions = primaryProfile?.permissions || [];
    }

    // 4. Construct Hydration Payload for the Frontend
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        onboardingStatus: user.onboardingStatus,
      },
      // Safely pass Lab & Wallet data (null if owner hasn't finished onboarding)
      lab: activeLab
        ? {
            id: activeLab.id,
            name: activeLab.name,
            portalSlug: activeLab.portalSlug,
            branchId: activeBranch?.id || null,
            branchName: activeBranch?.name || "Main Branch",
            isLisIntegrationPaid: activeLab.wallet?.isLisIntegrationPaid || false,
            // 💰 Include live wallet balance for the UI Header
            wallet: activeLab.wallet
              ? {
                  balance: Number(activeLab.wallet.balance),
                  isActive: activeLab.wallet.isActive,
                  validityEndDate: activeLab.wallet.validityEndDate,
                }
              : null,
          }
        : null,
      permissions,
    });
  } catch (error: any) {
    console.error("Auth /me API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}