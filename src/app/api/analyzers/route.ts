import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const analyzers = await prisma.analyzer.findMany({
    where: { labId: user.labId },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(analyzers);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    // Create new machine
    const analyzer = await prisma.analyzer.create({
      data: {
        labId: user.labId,
        name: body.name,
        modelName: body.modelName,
        brand: body.brand,
        type: body.type,
        ipAddress: body.ipAddress,
        status: 'ACTIVE'
      }
    });

    return NextResponse.json(analyzer);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add machine' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await prisma.analyzer.delete({
    where: { id, labId: user.labId } // Ensure ownership
  });

  return NextResponse.json({ success: true });
}