import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const lab = await prisma.lab.findUnique({
      where: { id: user.labId },
      select: { logo: true, letterhead: true, footer: true, signature: true, name: true },
    });

    return NextResponse.json(lab || {});
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { logo, letterhead, footer, signature } = body;

    const updateData: any = {};
    if (logo !== undefined) updateData.logo = logo || null;
    if (letterhead !== undefined) updateData.letterhead = letterhead || null;
    if (footer !== undefined) updateData.footer = footer || null;
    if (signature !== undefined) updateData.signature = signature || null;

    await prisma.lab.update({
      where: { id: user.labId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
