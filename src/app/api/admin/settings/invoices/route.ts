import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Upsert System Configuration
    // Assuming you have a single row for system config
    const config = await prisma.systemConfig.updateMany({
      data: {
        systemName: body.businessName,
        systemAddress: body.address,
        systemPhone: body.phone,
        systemEmail: body.email,
        systemLogo: body.logo,
        // You might need to add specific fields to SystemConfig model for footer/terms
        // or store them in a JSON field if flexible
      }
    });

    return NextResponse.json({ message: 'Invoice settings updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}