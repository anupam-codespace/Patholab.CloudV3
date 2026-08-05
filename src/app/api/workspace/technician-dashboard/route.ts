import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const labId = user.labId;
    const branchId = user.branchId;

    // Branch-scoped filter for technicians
    const where: any = { labId };
    if (branchId) {
      where.OR = [{ branchId }, { branchId: null }];
    }

    // Fetch stats
    const [pendingTests, processingTests, completedToday, approvedToday, pendingSamples, totalTests] = await Promise.all([
      prisma.test.count({ where: { ...where, status: 'PENDING' } }),
      prisma.test.count({ where: { ...where, status: { in: ['IN_PROGRESS', 'COMPLETED'] } } }),
      prisma.test.count({ where: { ...where, status: 'COMPLETED', completedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      prisma.test.count({ where: { ...where, status: 'APPROVED', approvedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      prisma.sample.count({ where: { ...where, status: { in: ['COLLECTED', 'RECEIVED'] } } }),
      prisma.test.count({ where }),
    ]);

    // Recent worklist (last 20 tests)
    const worklist = await prisma.test.findMany({
      where: { ...where, status: { in: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] } },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { name: true, patientId: true, age: true, gender: true, phone: true } },
      },
    });

    // Low stock alerts — simplified (InventoryItem doesn't have minStockLevel in this schema)
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: { labId, isActive: true },
      include: { batches: { where: { currentQuantity: { gt: 0 } }, select: { currentQuantity: true } } },
      take: 5,
    });
    const lowStock = lowStockItems
      .map(item => ({
        id: item.id,
        name: item.name,
        totalStock: item.batches.reduce((s, b) => s + b.currentQuantity, 0),
        minStockLevel: 10, // default threshold
        unit: 'units',
      }))
      .filter(item => item.totalStock <= item.minStockLevel);

    return NextResponse.json({
      stats: { pendingTests, processingTests, completedToday, approvedToday, pendingSamples, totalTests },
      worklist: worklist.map(t => ({
        ...t,
        price: Number(t.price || 0),
        checkedBy: t.checkedBy || null,
        checkedAt: t.checkedAt || null,
        approvedBy: t.approvedBy || null,
        approvedAt: t.approvedAt || null,
      })),
      lowStock,
    });
  } catch (error) {
    console.error("Technician dashboard error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
