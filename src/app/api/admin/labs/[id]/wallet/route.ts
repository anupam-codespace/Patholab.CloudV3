import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { labId: string } }
) {
  try {
    // 1. Strict Super Admin Guard
    const admin = await getDataFromToken(req);
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Super Admin access required." }, { status: 403 });
    }

    // 2. Parse the new rates
    const body = await req.json();
    const { perPatientFee, minimumRecharge } = body;

    if (perPatientFee === undefined && minimumRecharge === undefined) {
      return NextResponse.json({ error: "No update fields provided." }, { status: 400 });
    }

    // 3. Update the Lab's Specific Wallet Pricing
    const updatedWallet = await prisma.labWallet.update({
      where: { labId: params.labId },
      data: {
        ...(perPatientFee !== undefined && { perPatientFee }),
        ...(minimumRecharge !== undefined && { minimumRecharge }),
      },
    });

    return NextResponse.json({
      message: "Lab pricing configured successfully",
      wallet: {
        perPatientFee: Number(updatedWallet.perPatientFee),
        minimumRecharge: Number(updatedWallet.minimumRecharge),
      }
    });

  } catch (error: any) {
    console.error("Admin Wallet Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}