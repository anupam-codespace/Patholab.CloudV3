import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate the user making the request (Admin/Manager)
    const admin = await getDataFromToken(req);
    if (!admin?.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = params.id;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 2. Multi-Tenant Security Check
    // Prevent an admin from fetching activity logs of a user who belongs to a different lab.
    const staffRecord = await prisma.labStaff.findUnique({
      where: {
        labId_userId: {
          labId: admin.labId,
          userId: targetUserId,
        }
      }
    });

    if (!staffRecord) {
      return NextResponse.json(
        { error: 'Staff member not found in your laboratory context.' }, 
        { status: 404 }
      );
    }

    // 3. Fetch Activity Logs
    // This fetches all actions performed BY this specific user.
    const logs = await prisma.activityLog.findMany({
      where: { 
        userId: targetUserId 
      },
      orderBy: { 
        createdAt: 'desc' // Newest activities first
      },
      take: 50, // Limit to the last 50 activities to keep the UI fast and responsive
    });

    return NextResponse.json(logs);

  } catch (error: any) {
    console.error("Fetch Activity Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" }, 
      { status: 500 }
    );
  }
}