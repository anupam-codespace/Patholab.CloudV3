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

    const where: any = { labId };
    if (branchId) {
      where.OR = [{ branchId }, { branchId: null }];
    }

    // Today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch stats
    const [todayPatients, todayInvoices, pendingPayments, totalRevenue, pendingReports, totalPatients] = await Promise.all([
      prisma.patient.count({ where: { ...where, createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.invoice.count({ where: { ...where, createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.invoice.count({ where: { ...where, paymentStatus: { in: ['PENDING', 'PARTIAL'] } } }),
      prisma.invoice.aggregate({ where: { ...where, paymentStatus: 'PAID', createdAt: { gte: todayStart } }, _sum: { grandTotal: true } }),
      prisma.test.count({ where: { ...where, status: { in: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] } } }),
      prisma.patient.count({ where: { ...where, deletedAt: null } }),
    ]);

    // Recent patients (last 10)
    const recentPatients = await prisma.patient.findMany({
      where: { ...where, deletedAt: null },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        invoices: { take: 1, orderBy: { createdAt: 'desc' }, select: { invoiceNumber: true, grandTotal: true, paymentStatus: true } },
        tests: { take: 1, orderBy: { createdAt: 'desc' }, select: { testName: true, status: true } },
      },
    });

    // Today's appointments
    const appointments = await prisma.appointment.findMany({
      where: { ...where, appointmentDate: { gte: todayStart, lte: todayEnd } },
      take: 10,
      orderBy: { appointmentDate: 'asc' },
      include: { patient: { select: { name: true, patientId: true, phone: true } } },
    });

    return NextResponse.json({
      stats: {
        todayPatients,
        todayInvoices,
        pendingPayments,
        totalRevenue: Number(totalRevenue._sum.grandTotal || 0),
        pendingReports,
        totalPatients,
      },
      recentPatients: recentPatients.map(p => ({
        ...p,
        walletBalance: Number(p.walletBalance || 0),
        invoices: p.invoices.map(i => ({ ...i, grandTotal: Number(i.grandTotal) })),
      })),
      appointments: appointments.map(a => ({ ...a, paymentCollected: Number(a.paymentCollected || 0) })),
    });
  } catch (error) {
    console.error("Receptionist dashboard error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
