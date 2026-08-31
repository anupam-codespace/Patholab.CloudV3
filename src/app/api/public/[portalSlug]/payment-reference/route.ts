import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ============================================================================
// POST /api/public/[portalSlug]/payment-reference
// Public endpoint that lets a patient submit their UPI transaction ID / UTR
// AFTER booking. The lab owner then verifies it from the dashboard.
//
// Body: { trackId, paymentReference, paymentMode }
// ============================================================================
export async function POST(
  req: NextRequest,
  { params }: { params: { portalSlug: string } }
) {
  try {
    const body = await req.json();
    const { trackId, paymentReference, paymentMode } = body || {};

    if (!trackId || !paymentReference) {
      return NextResponse.json(
        { error: 'trackId and paymentReference are required' },
        { status: 400 }
      );
    }

    // 1. Find the lab by portalSlug (security check — the appointment must
    // belong to the lab whose portalSlug is in the URL).
    const lab = await prisma.lab.findUnique({
      where: { portalSlug: params.portalSlug },
      select: { id: true },
    });
    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 });
    }

    // 2. Find the appointment by trackId AND labId
    const appointment = await prisma.appointment.findFirst({
      where: { trackId, labId: lab.id },
    });
    if (!appointment) {
      return NextResponse.json({ error: 'Tracking ID not found' }, { status: 404 });
    }

    // 3. Update the appointment with the patient-submitted payment reference
    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        transactionId: String(paymentReference).trim(),
        paymentMode: paymentMode || 'UPI',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment reference submitted. The lab will verify it shortly.',
      trackId: updated.trackId,
    });
  } catch (error: any) {
    console.error('[PUBLIC_PAYMENT_REFERENCE]', error);
    return NextResponse.json(
      { error: 'Failed to submit payment reference' },
      { status: 500 }
    );
  }
}
