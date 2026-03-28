import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [config, plans] = await Promise.all([
      prisma.systemConfig.findFirst(),
      prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' }
      })
    ]);

    // Default content if DB is empty
    const landingContent = config?.landingPage || {
      heroTitle: "Modern Pathology Lab Management",
      heroSubtitle: "Streamline your diagnostics business with our cloud-based LIMS.",
      features: [
        { title: "Smart Reports", desc: "Generate PDF reports with one click." },
        { title: "Inventory", desc: "Track reagents and stock levels." },
        { title: "Billing", desc: "GST compliant invoicing." }
      ]
    };

    return NextResponse.json({
      content: landingContent,
      plans: plans,
      system: { name: config?.systemName, logo: config?.systemLogo }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}