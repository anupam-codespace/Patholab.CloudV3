import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request
    const session = await getDataFromToken(req);
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Form Body
    const body = await req.json();
    const { labName, licenseNumber } = body;

    if (!labName || !licenseNumber) {
      return NextResponse.json(
        { error: "Laboratory name and license number are required." },
        { status: 400 }
      );
    }

    // 3. Prevent Double Lab Creation for the same Owner
    const existingLab = await prisma.lab.findUnique({
      where: { ownerId: session.userId },
    });
    if (existingLab) {
      return NextResponse.json(
        { error: "A laboratory has already been configured for this account." },
        { status: 400 }
      );
    }

    // 4. Fetch Global Pricing Defaults (The Master-Override Pattern)
    const sysConfig = await prisma.systemConfig.findFirst();
    const defaultFee = sysConfig?.defaultRegFee || 2.50;
    const defaultMin = sysConfig?.defaultMinRecharge || 100.00;

    // 5. Generate URL Slug and unique Code
    const cleanSlug = labName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    
    const shortCode = labName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 4) + Math.floor(1000 + Math.random() * 9000);

    // 6. Execute Relational Transaction (Lab + Branch + Wallet)
    const newLab = await prisma.$transaction(async (tx) => {
      // A. Create the Lab instance
      const lab = await tx.lab.create({
        data: {
          name: labName,
          licenseNumber: licenseNumber,
          portalSlug: cleanSlug,
          labCode: shortCode,
          ownerId: session.userId,
          address: "Update Address", 
          city: "Update City",
          state: "Update State",
          pincode: "000000",
          phone: "0000000000",
          email: session.email || "update@email.com",
          isActive: true,
        },
      });

      // B. Create the Primary Main Branch
      await tx.branch.create({
        data: {
          labId: lab.id,
          name: `${labName} - Headquarters`,
          branchCode: `${shortCode}-HQ`,
          isMainBranch: true,
          address: "Update Address",
          city: "Update City",
          state: "Update State",
          pincode: "000000",
        },
      });

      // C. Initialize the Pay-As-You-Go Wallet Context
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      await tx.labWallet.create({
        data: {
          labId: lab.id,
          balance: 0.00,
          validityEndDate: oneYearFromNow,
          isActive: true,
          isLisIntegrationPaid: false,
          // ✅ Apply the dynamic pricing defaults
          perPatientFee: defaultFee,
          minimumRecharge: defaultMin,
        },
      });

      // D. Update User Account to active status
      await tx.user.update({
        where: { id: session.userId },
        data: { 
          isActive: true,
          onboardingStatus: "COMPLETED" 
        },
      });

      return lab;
    });

    return NextResponse.json({
      success: true,
      message: "Laboratory setup executed successfully.",
      labId: newLab.id,
    });

  } catch (error: any) {
    console.error("Lab Setup Transaction Failure:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A laboratory with this license number or registration already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error during onboarding setup." },
      { status: 500 }
    );
  }
}