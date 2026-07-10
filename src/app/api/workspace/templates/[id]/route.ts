import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const template = await prisma.reportTemplate.findFirst({ where: { id, labId: user.labId } });
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ template });
  } catch (error) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();
    const { name, config, isActive } = body;
    const existing = await prisma.reportTemplate.findFirst({ where: { id, labId: user.labId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (config !== undefined) updateData.config = typeof config === "string" ? config : JSON.stringify(config);
    if (isActive !== undefined) {
      updateData.isActive = !!isActive;
      if (isActive) { await prisma.reportTemplate.updateMany({ where: { labId: user.labId, id: { not: id } }, data: { isActive: false } }); }
    }
    const template = await prisma.reportTemplate.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, template });
  } catch (error: any) { return NextResponse.json({ error: "Failed: " + error.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const existing = await prisma.reportTemplate.findFirst({ where: { id, labId: user.labId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.reportTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
