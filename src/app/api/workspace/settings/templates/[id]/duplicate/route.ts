import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, getDataFromToken } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function getAuthenticatedLabId(req: NextRequest): Promise<string | null> {
  const user = (await getDataFromToken(req)) || (await getCurrentUser());
  if (!user) return null;
  const userId = user.userId || (user as any).id;
  if (user.labId) return user.labId;

  if (userId) {
    const ownerLab = await prisma.lab.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (ownerLab) return ownerLab.id;

    const staffLab = await prisma.labStaff.findFirst({
      where: { userId, isActive: true },
      select: { labId: true },
    });
    if (staffLab) return staffLab.labId;

    if (user.role === "SUPER_ADMIN") {
      const firstLab = await prisma.lab.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      if (firstLab) return firstLab.id;
    }
  }

  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const source = await prisma.reportTemplate.findFirst({
      where: { id: params.id, labId },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source template not found' }, { status: 404 });
    }

    const duplicate = await prisma.reportTemplate.create({
      data: {
        labId,
        name: `${source.name} (Copy)`,
        type: source.type,
        config: source.config as any,
        content: source.content as any,
        isActive: false,
      },
    });

    revalidatePath('/workspace/settings/templates');

    return NextResponse.json({
      success: true,
      message: 'Template duplicated successfully',
      template: duplicate,
    });
  } catch (error: any) {
    console.error('POST /api/workspace/settings/templates/[id]/duplicate Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to duplicate template' },
      { status: 500 }
    );
  }
}
