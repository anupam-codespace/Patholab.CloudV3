import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const lab = await prisma.lab.findUnique({
      where: { id: user.labId },
      select: { upiId: true, upiQrCode: true, name: true },
    });

    return NextResponse.json({
      upiId: lab?.upiId || "",
      upiQrCode: lab?.upiQrCode || "",
      labName: lab?.name,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { upiId, upiQrCode } = body;

    await prisma.lab.update({
      where: { id: user.labId },
      data: {
        upiId: upiId || null,
        upiQrCode: upiQrCode || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
