import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/public/[portalSlug]/payment-info
// Public endpoint that returns the lab's UPI ID + QR code so the booking
// form can display them after a booking is created. No auth required (the
// portalSlug is the public identifier).
// ============================================================================
export async function GET(
  req: NextRequest,
  { params }: { params: { portalSlug: string } }
) {
  try {
    const lab = await prisma.lab.findUnique({
      where: { portalSlug: params.portalSlug, isActive: true },
      select: {
        id: true,
        name: true,
        upiId: true,
        upiQrCode: true,
        phone: true,
      },
    });

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 });
    }

    return NextResponse.json({
      labName: lab.name,
      upiId: lab.upiId,
      upiQrCode: lab.upiQrCode,
      phone: lab.phone,
    });
  } catch (error: any) {
    console.error('[PUBLIC_PAYMENT_INFO]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
