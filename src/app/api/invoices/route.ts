// FILE: src/app/api/invoices/route.ts
// Invoices API
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
    const status = searchParams.get('status');
    
    const where: any = {
      labId: currentUser.labId,
    };
    
    if (status && status !== 'ALL') {
      where.status = status;
    }
    
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    
    // Calculate stats
    const stats = {
      totalRevenue: invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.grandTotal, 0),
      pendingAmount: invoices.filter(i => i.status === 'PENDING').reduce((sum, i) => sum + i.grandTotal, 0),
      pendingCount: invoices.filter(i => i.status === 'PENDING').length,
      overdueAmount: invoices.filter(i => i.status === 'OVERDUE').reduce((sum, i) => sum + i.grandTotal, 0),
      overdueCount: invoices.filter(i => i.status === 'OVERDUE').length,
      monthlyRevenue: invoices
        .filter(i => {
          const date = new Date(i.createdAt);
          const now = new Date();
          return i.status === 'PAID' && 
                 date.getMonth() === now.getMonth() && 
                 date.getFullYear() === now.getFullYear();
        })
        .reduce((sum, i) => sum + i.grandTotal, 0),
    };
    
    return NextResponse.json({ invoices, stats });
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}