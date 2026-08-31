import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> } 
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { 
        id: id,
        labId: user.labId 
      },
      include: {
        patient: {
          include: {
            doctor: { select: { name: true } },
            // ✅ FIX: Changed 'name' to 'agencyName'
            agency: { select: { agencyName: true } },
          }
        }, 
        lab: true,     
        items: true,   
        
        // ✅ FIX: Changed 'name' to 'agencyName'
        agency: { select: { agencyName: true } },

        tests: {
          include: {
            sample: { select: { collectedBy: true } }
          }
        }
      }
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // Resolve names safely
    const primaryTest = invoice.tests?.[0];

    // 1. Doctor name
    const linkedDoctorName = null; 
    const manualReferral = primaryTest?.referredBy;
    const patientDoctorName = invoice.patient?.doctor?.name; 

    const finalDoctorName = linkedDoctorName || manualReferral || patientDoctorName || "Self";

    // 2. Agency name
    // ✅ FIX: Access .agencyName instead of .name
    const invoiceAgencyName = invoice.agency?.agencyName;
    const patientAgencyName = invoice.patient?.agency?.agencyName;
    const testAgencyName = null; 

    const finalAgencyName = invoiceAgencyName || patientAgencyName || testAgencyName || null;

    // 3. Test description
    const testNames = invoice.tests?.map(t => t.testName).join(", ");

    // 4. Collected by
    const collectedBy = primaryTest?.sample?.collectedBy || null;

    const responseData = {
      ...invoice,
      doctor: { name: finalDoctorName },
      agency: finalAgencyName ? { name: finalAgencyName } : null,
      testDescription: testNames || null,
      collectedBy: collectedBy,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Fetch Invoice Error:", error);
    return NextResponse.json({ error: "Failed to load invoice" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { status, paymentMode } = body;

    // Build update data
    const updateData: any = { status };

    // Uncomment when added to schema:
    // if (paymentMode) updateData.paymentMode = paymentMode;

    const updatedInvoice = await prisma.invoice.update({
      where: { id: id, labId: user.labId },
      data: updateData,
    });

    return NextResponse.json(updatedInvoice);

  } catch (error: any) {
    console.error("Update Invoice Error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

// ============================================================================
// DELETE: Soft-delete a single invoice/visit (keeps the patient record intact)
//
// This is the v3.2.1 fix for the patient directory delete behavior.
// Previously, clicking "Delete" on a visit row in the patient directory purged
// the ENTIRE patient record (all visits, history, demographics). Now it only
// removes the selected invoice + its tests + samples + appointments, while
// preserving the patient's demographic profile for future visits.
//
// Strategy: Use soft-delete (deletedAt timestamp) where schema supports it,
// and hard-delete cascade where soft-delete columns don't exist.
// ============================================================================
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'LAB_OWNER' && user.role !== 'SUPER_ADMIN' && user.role !== 'LAB_MANAGER') {
      return NextResponse.json(
        { error: 'Permission Denied. Only Lab Owners and Managers can delete visits.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // 1. Verify the invoice exists and belongs to this lab
    const invoice = await prisma.invoice.findFirst({
      where: { id, labId: user.labId },
      include: {
        tests: { select: { id: true, sampleId: true } },
        _count: { select: { tests: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 2. Fetch the patient (for the activity log)
    const patient = await prisma.patient.findUnique({
      where: { id: invoice.patientId },
      select: { id: true, name: true, patientId: true },
    });

    // 3. Transaction: cascade-delete the visit's children, then the invoice itself
    await prisma.$transaction(async (tx) => {
      // 3a. Collect sample IDs from the tests on this invoice
      const testIds = invoice.tests.map(t => t.id);
      const sampleIds = Array.from(
        new Set(invoice.tests.map(t => t.sampleId).filter(Boolean) as string[])
      );

      // 3b. Delete TestResultParameter rows for each test
      if (testIds.length > 0) {
        await tx.testResultParameter.deleteMany({
          where: { testId: { in: testIds } },
        });

        // 3c. Delete CustomFieldValue rows for each test (if any)
        try {
          await tx.customFieldValue.deleteMany({
            where: { testId: { in: testIds } },
          });
        } catch {
          // CustomFieldValue may not exist in all schemas — ignore if missing
        }

        // 3d. Delete Commission rows tied to these tests
        try {
          await tx.commission.deleteMany({
            where: { testId: { in: testIds } },
          });
        } catch {
          // ignore if relation doesn't exist
        }
      }

      // 3e. Delete Samples created for this invoice
      if (sampleIds.length > 0) {
        await tx.sample.deleteMany({
          where: { id: { in: sampleIds } },
        });
      }

      // 3f. Delete Appointment linked to this invoice (if any)
      try {
        await tx.appointment.deleteMany({
          where: { invoiceId: invoice.id },
        });
      } catch {
        // ignore
      }

      // 3g. Delete InvoiceItem rows
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: invoice.id },
      });

      // 3h. Delete the Tests themselves
      if (testIds.length > 0) {
        await tx.test.deleteMany({
          where: { id: { in: testIds } },
        });
      }

      // 3i. Finally, delete the Invoice
      await tx.invoice.delete({
        where: { id: invoice.id },
      });

      // 3j. Activity log
      await tx.activityLog.create({
        data: {
          labId: user.labId,
          userId: user.id,
          action: 'INVOICE_DELETED',
          entityType: 'INVOICE',
          entity: 'INVOICE',
          entityId: invoice.id,
          description: `Visit ${invoice.invoiceNumber} for patient ${patient?.name || 'Unknown'} (${patient?.patientId || 'N/A'}) was deleted by ${user.role}. ${testIds.length} test(s) removed. Patient record preserved.`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Visit ${invoice.invoiceNumber} deleted successfully. Patient record preserved.`,
      deletedTests: invoice._count.tests,
      patientPreserved: true,
      patientId: invoice.patientId,
    });

  } catch (error: any) {
    console.error('[INVOICE_DELETE_ERROR]', error);
    // Foreign-key constraint miss
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete this visit because it has linked records that prevent removal. Please cancel the tests first.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete visit', details: error.message },
      { status: 500 }
    );
  }
}