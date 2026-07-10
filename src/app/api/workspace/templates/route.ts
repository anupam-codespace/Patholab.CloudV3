import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const templates = await prisma.reportTemplate.findMany({ where: { labId: user.labId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ templates });
  } catch (error) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { name, config, isActive } = body;
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const configStr = typeof config === "string" ? config : JSON.stringify(config);
    if (isActive) { await prisma.reportTemplate.updateMany({ where: { labId: user.labId }, data: { isActive: false } }); }
    const template = await prisma.reportTemplate.create({ data: { labId: user.labId, name, config: configStr, isActive: !!isActive } });
    return NextResponse.json({ success: true, template });
  } catch (error: any) { return NextResponse.json({ error: "Failed: " + error.message }, { status: 500 }); }
}
