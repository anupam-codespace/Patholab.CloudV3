// FILE: src/app/api/staff/[id]/toggle/route.ts
// Toggle staff active status
// ==========================================
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || !currentUser.labId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const body = await request.json();
    
    const staff = await prisma.labStaff.update({
      where: { id: params.id },
      data: { isActive: body.isActive },
    });
    
    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Toggle staff status error:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}