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
            // ✅ correct relation names (capitalised)
            Doctor: { select: { name: true } },
            Agency: { select: { name: true } },
          }
        }, 
        lab: true,     
        items: true,   
        
        // Invoice → Agency relation
        Agency: { select: { name: true } },

        tests: {
          include: {
            // Test does not have doctor/agency relations yet, so we omit them.
            // If you add them later, uncomment:
            // doctor: { select: { name: true, user: { select: { name: true } } } },
            // agency: { select: { name: true } },
            sample: { select: { collectedBy: true } }
          }
        }
      }
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // Resolve names safely
    const primaryTest = invoice.tests?.[0];

    // 1. Doctor name
    const linkedDoctorName = null; // will use manually entered string if present
    const manualReferral = primaryTest?.referredBy;
    const patientDoctorName = invoice.patient?.Doctor?.name; // corrected

    const finalDoctorName = linkedDoctorName || manualReferral || patientDoctorName || "Self";

    // 2. Agency name
    const invoiceAgencyName = invoice.Agency?.name;
    const patientAgencyName = invoice.patient?.Agency?.name;
    const testAgencyName = null; // no relation yet

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
      // paymentMode not yet in schema; omit or add later
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
    const { status, paymentMode } = body; // paymentMode currently not stored

    // Build update data – only include fields that exist
    const updateData: any = { status };
    // If you add paymentMode column to Invoice model, uncomment:
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