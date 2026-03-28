import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: List all pages
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (user?.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const pages = await prisma.page.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(pages);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}

// POST: Create new page
export async function POST(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (user?.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    // Validate Slug uniqueness
    const existing = await prisma.page.findUnique({ where: { slug: body.slug } });
    if (existing) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });

    const page = await prisma.page.create({
      data: {
        title: body.title,
        slug: body.slug.toLowerCase().replace(/ /g, '-'), // Auto-format slug
        content: body.content,
        metaTitle: body.metaTitle,
        metaDesc: body.metaDesc,
        isPublished: body.isPublished
      }
    });

    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}

