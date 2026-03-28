import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDataFromToken } from '@/lib/auth';

// --- 1. GET: Fetch Invoice Details ---
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
                agency: true, 
                doctor: {
                    include: { user: true }
                }
            }
        }, 
        lab: true,     
        items: true,   
        
        agency: {
            select: { agencyName: true }
        },

        tests: {
            include: {
                doctor: {
                    include: { user: true } 
                },
                // ✅ ADDED: Fetch Sample to get collectedBy
                sample: {
                    select: { collectedBy: true }
                }
            }
        }
      }
    });

    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    // --- SMART RESOLUTION LOGIC ---
    
    // A. Resolve Doctor Name
    const primaryTest = invoice.tests?.[0];
    
    // Priority 1: Linked Doctor User Profile
    const linkedDoctorName = primaryTest?.doctor?.user?.name || primaryTest?.doctor?.name;
    
    // Priority 2: Manual Text Entry (referredBy)
    const manualReferral = primaryTest?.referredBy;

    // Priority 3: Patient Default Doctor
    const patientDoctorName = invoice.patient?.doctor?.user?.name;
    
    const finalDoctorName = linkedDoctorName || manualReferral || patientDoctorName || "Self";

    // B. Resolve Agency Name
    const invoiceAgencyName = invoice.agency?.agencyName;
    const patientAgencyName = invoice.patient?.agency?.agencyName;
    const testAgencyName = (primaryTest as any)?.agency?.agencyName; 
    
    const finalAgencyName = invoiceAgencyName || patientAgencyName || testAgencyName || null;

    // C. Resolve Test Descriptions
    const testNames = invoice.tests?.map(t => t.testName).join(", ");

    // ✅ D. Resolve Collected By
    const collectedBy = primaryTest?.sample?.collectedBy || null;

    const responseData = {
        ...invoice,
        doctor: { name: finalDoctorName }, 
        agency: finalAgencyName ? { name: finalAgencyName } : null,
        testDescription: testNames || null,
        paymentMode: invoice.paymentMode,
        collectedBy: collectedBy // ✅ Added to response
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Fetch Invoice Error:", error);
    return NextResponse.json({ error: "Failed to load invoice" }, { status: 500 });
  }
}

// --- 2. PATCH: Update Payment Status ---
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

    const updatedInvoice = await prisma.invoice.update({
      where: { id: id, labId: user.labId },
      data: { 
        status: status,
        paymentMode: paymentMode || undefined
      }
    });

    return NextResponse.json(updatedInvoice);

  } catch (error: any) {
    console.error("Update Invoice Error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}