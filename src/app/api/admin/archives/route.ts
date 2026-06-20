import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parallel fetch of ONLY the entities that currently have 'deletedAt'
    const [labs, branches, patients, staff] = await Promise.all([
      prisma.lab.findMany({ where: { deletedAt: { not: null } }, take: 100 }),
      prisma.branch.findMany({ where: { deletedAt: { not: null } }, include: { lab: { select: { name: true } } }, take: 100 }),
      prisma.patient.findMany({ where: { deletedAt: { not: null } }, include: { lab: { select: { name: true } } }, take: 100 }),
      prisma.labStaff.findMany({ where: { deletedAt: { not: null } }, include: { lab: { select: { name: true } }, user: { select: { name: true, email: true } } }, take: 100 }),
    ]);

    // Unify the data structure for the frontend table
    const unifiedData = [
      ...labs.map(item => ({ id: item.id, type: "LAB", name: item.name, labName: "Platform Level", deletedAt: item.deletedAt, raw: item })),
      ...branches.map(item => ({ id: item.id, type: "BRANCH", name: item.name, labName: item.lab?.name, deletedAt: item.deletedAt, raw: item })),
      ...patients.map(item => ({ id: item.id, type: "PATIENT", name: item.name, labName: item.lab?.name, deletedAt: item.deletedAt, raw: item })),
      ...staff.map(item => ({ id: item.id, type: "STAFF", name: item.user?.name || item.user?.email, labName: item.lab?.name, deletedAt: item.deletedAt, raw: item })),
    ];

    // Sort globally by most recently deleted
    unifiedData.sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());

    return NextResponse.json({ data: unifiedData });
  } catch (error) {
    console.error("[ADMIN_ARCHIVES_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, type, action } = await req.json();

    if (!id || !type || !["RESTORE", "PURGE"].includes(action)) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const isRestore = action === "RESTORE";
    const updateData = { deletedAt: null };

    // Dynamic Execution based on Entity Type
    switch (type) {
      case "LAB":
        if (isRestore) await prisma.lab.update({ where: { id }, data: updateData });
        else await prisma.lab.delete({ where: { id } });
        break;
      case "BRANCH":
        if (isRestore) await prisma.branch.update({ where: { id }, data: updateData });
        else await prisma.branch.delete({ where: { id } });
        break;
      case "PATIENT":
        if (isRestore) await prisma.patient.update({ where: { id }, data: updateData });
        else await prisma.patient.delete({ where: { id } });
        break;
      case "STAFF":
        if (isRestore) await prisma.labStaff.update({ where: { id }, data: updateData });
        else await prisma.labStaff.delete({ where: { id } });
        break;
      default:
        return NextResponse.json({ error: "Unknown or unsupported entity type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Successfully ${isRestore ? 'restored' : 'purged'} ${type}` });
  } catch (error) {
    console.error("[ADMIN_ARCHIVES_POST]", error);
    return NextResponse.json({ error: "Failed to process archive action" }, { status: 500 });
  }
}