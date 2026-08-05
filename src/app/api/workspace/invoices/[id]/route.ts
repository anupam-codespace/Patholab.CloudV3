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