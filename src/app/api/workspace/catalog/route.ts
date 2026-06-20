import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Secure Authentication via Session Token
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    // 2. Build Advanced Query for Master-Local Architecture
    const whereClause: any = {
      isActive: true,
      AND: [
        {
          // Fetch system-wide standard tests OR custom tests unique to this lab
          OR: [
            { labId: user.labId },
            { isGlobal: true } 
          ]
        }
      ]
    };

    // 3. Append Search Filters Safely
    if (search) {
      whereClause.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    // 4. Execute Query
    const templates = await prisma.testTemplate.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: { 
        // Updated from 'category' to 'department' to match your new schema
        department: true 
      }
    });

    return NextResponse.json(templates);

  } catch (error) {
    console.error('[TEST_TEMPLATE_GET_ERROR]', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}