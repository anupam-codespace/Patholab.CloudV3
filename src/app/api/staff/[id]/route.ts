// ==========================================
// FILE: src/app/api/staff/[id]/route.ts
// Single staff operations
// ==========================================
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || !currentUser.labId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Delete staff record (user remains but unlinked from lab)
    await prisma.labStaff.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json({ error: 'Failed to remove staff' }, { status: 500 });
  }
}
