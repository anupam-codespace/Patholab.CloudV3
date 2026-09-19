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

// ============================================================================
// GET: Fetch single template by ID
// ============================================================================
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await prisma.reportTemplate.findFirst({
      where: { id: params.id, labId },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('GET /api/workspace/settings/templates/[id] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT / PATCH: Update existing template
// ============================================================================
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdate(req, params.id);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleUpdate(req, params.id);
}

async function handleUpdate(req: NextRequest, id: string) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const existing = await prisma.reportTemplate.findFirst({
      where: { id, labId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Merge or update config
    let updatedConfig = body.config || existing.config || {};
    if (typeof updatedConfig === 'string') {
      try { updatedConfig = JSON.parse(updatedConfig); } catch (e) { updatedConfig = {}; }
    }

    if (body.headerText !== undefined || body.footerText !== undefined) {
      const cfg: any = { ...updatedConfig };
      if (!cfg.header) cfg.header = { show: true, mode: 'standard' };
      if (!cfg.footer) cfg.footer = { show: true, mode: 'standard' };
      if (body.headerText !== undefined) cfg.header.title = body.headerText;
      if (body.footerText !== undefined) cfg.footer.text = body.footerText;
      if (body.showLogo !== undefined) {
        if (!cfg.branding) cfg.branding = {};
        cfg.branding.showLogo = !!body.showLogo;
      }
      if (body.showNabl !== undefined) cfg.footer.showNabl = !!body.showNabl;
      updatedConfig = cfg;
    }

    const updated = await prisma.reportTemplate.update({
      where: { id },
      data: {
        name: body.name || existing.name,
        config: updatedConfig,
        isActive: body.isActive !== undefined ? !!body.isActive : existing.isActive,
        updatedAt: new Date(),
      },
    });

    // If marked active, deactivate others
    if (body.isActive) {
      await prisma.reportTemplate.updateMany({
        where: { labId, id: { not: id } },
        data: { isActive: false },
      });
    }

    revalidatePath('/workspace/settings/templates');
    revalidatePath('/workspace/reports/print');

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      template: updated,
    });
  } catch (error: any) {
    console.error('PUT /api/workspace/settings/templates/[id] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE: Delete template
// ============================================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const labId = await getAuthenticatedLabId(req);
    if (!labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.reportTemplate.findFirst({
      where: { id: params.id, labId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await prisma.reportTemplate.delete({
      where: { id: params.id },
    });

    revalidatePath('/workspace/settings/templates');

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    console.error('DELETE /api/workspace/settings/templates/[id] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    );
  }
}
