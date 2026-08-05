// FILE: src/app/api/reports/route.ts
// Lab Reports API
// ==========================================
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || !currentUser.labId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    const where: any = {
      labId: currentUser.labId,
    };
    
    if (from && to) {
      where.createdAt = {
        gte: new Date(from),
        lte: new Date(to),
      };
    }
    
    // Fetch report data
    const [tests, invoices, patients] = await Promise.all([
      prisma.test.findMany({ where }),
      prisma.invoice.findMany({ where }),
      prisma.patient.findMany({ 
        where: { 
          labId: currentUser.labId,
          createdAt: where.createdAt,
        },
      }),
    ]);
    
    const summary = {
      revenue: invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.grandTotal, 0),
      invoices: invoices.length,
      tests: tests.filter(t => t.status === 'COMPLETED').length,
      avgTestsPerDay: tests.length / 30,
      newPatients: patients.length,
      totalPatients: await prisma.patient.count({ where: { labId: currentUser.labId } }),
      avgInvoiceValue: invoices.length > 0 
        ? invoices.reduce((sum, i) => sum + i.grandTotal, 0) / invoices.length 
        : 0,
    };
    
    return NextResponse.json({ summary, revenueData: [], testData: [], topTests: [], paymentMethods: [] });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}