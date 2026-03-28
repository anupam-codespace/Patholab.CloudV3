// FILE: src/app/api/tests/categories/route.ts
// Test categories API
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
    
    const categories = await prisma.testCategory.findMany({
      where: { 
        labId: currentUser.labId,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
    
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || !currentUser.labId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const body = await request.json();
    
    const category = await prisma.testCategory.create({
      data: {
        labId: currentUser.labId,
        name: body.name,
        description: body.description,
        isActive: true,
      },
    });
    
    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}