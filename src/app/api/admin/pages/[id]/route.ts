import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

// GET: Single Page
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const page = await prisma.page.findUnique({ where: { id: params.id } });
  return NextResponse.json(page);
}

// PATCH: Update Page
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getDataFromToken(req);
  if (user?.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const page = await prisma.page.update({
    where: { id: params.id },
    data: {
       title: body.title,
       slug: body.slug,
       content: body.content,
       metaTitle: body.metaTitle,
       metaDesc: body.metaDesc,
       isPublished: body.isPublished
    }
  });
  return NextResponse.json(page);
}

// DELETE: Remove Page
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getDataFromToken(req);
  if (user?.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.page.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}