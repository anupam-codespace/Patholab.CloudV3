import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ============================================================================
// PATCH /api/workspace/appointments/[id]/payment
// Lab owner updates the payment info on an appointment:
//   - paymentMode (CASH / UPI / CARD / DUE)
//   - transactionId (UTR / reference number)
//   - paymentCollected (amount actually received)
//   - markAsPaid (boolean — sets paymentVerified = true and generates trackId)
// ============================================================================
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { paymentMode, transactionId, paymentCollected, markAsPaid } = body || {};

    // Verify ownership
    const appointment = await prisma.appointment.findFirst({
      where: { id, labId: user.labId },
    });
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (transactionId !== undefined) updateData.transactionId = transactionId?.trim() || null;
    if (paymentCollected !== undefined) updateData.paymentCollected = Number(paymentCollected) || 0;

    // If markAsPaid is true and not already verified, generate a trackId + mark verified
    if (markAsPaid && !appointment.paymentVerified) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const random = Math.floor(1000 + Math.random() * 9000);
      updateData.trackId = `TRK-${dateStr}-${random}`;
      updateData.paymentVerified = true;
      updateData.paymentVerifiedAt = now;
      updateData.paymentVerifiedBy = user.id || user.userId;
      updateData.status = 'CONFIRMED';
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
    });

    // If the appointment has an invoice, sync its paymentStatus too
    if (appointment.invoiceId && markAsPaid) {
      await prisma.invoice.update({
        where: { id: appointment.invoiceId },
        data: {
          paymentStatus: 'PAID',
          status: 'PAID',
        },
      }).catch(() => { /* non-fatal */ });
    }

    return NextResponse.json({
      success: true,
      appointment: updated,
      trackId: updated.trackId,
      message: markAsPaid
        ? `Payment verified! Track ID: ${updated.trackId}`
        : 'Payment info updated.',
    });
  } catch (error: any) {
    console.error('[APPOINTMENT_PAYMENT_PATCH]', error);
    return NextResponse.json(
      { error: 'Failed to update payment', details: error.message },
      { status: 500 }
    );
  }
}
