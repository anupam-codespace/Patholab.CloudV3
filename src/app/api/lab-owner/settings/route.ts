import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Fetch Lab Settings for the logged-in user
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // Security Check
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the lab details
    const lab = await prisma.lab.findUnique({
      where: { id: user.labId },
    });

    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 });
    }

    return NextResponse.json({ lab });
  } catch (error) {
    console.error('Error fetching lab settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Update Lab Settings
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // Security Check
    if (!user || !user.labId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Update the lab record
    const updatedLab = await prisma.lab.update({
      where: { id: user.labId },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        
        address: body.address,
        city: body.city,
        state: body.state,
        pincode: body.pincode,
        
        licenseNumber: body.licenseNumber,
        registrationNo: body.registrationNo,
        taxId: body.taxId,
        gstNumber: body.gstNumber,
        panNumber: body.panNumber,
        
        logo: body.logo,
        
        // Commission Settings
        commissionType: body.commissionType,
        defaultDoctorCommission: parseFloat(body.defaultDoctorCommission || 0),
        defaultAgencyCommission: parseFloat(body.defaultAgencyCommission || 0),
      },
    });

    return NextResponse.json({ lab: updatedLab, message: "Settings updated successfully" });
  } catch (error) {
    console.error('Error updating lab settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}