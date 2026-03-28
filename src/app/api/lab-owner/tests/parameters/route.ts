import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// --- GET: List All Parameters ---
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';

    // TODO: Replace with dynamic session.user.labId
    const lab = await prisma.lab.findFirst(); 
    if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 });

    const parameters = await prisma.labTestParameter.findMany({
      where: {
        labId: lab.id,
        isActive: true, // Only show active ones
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } }
        ]
      },
      orderBy: { name: 'asc' },
      include: {
        // Optional: Include ranges if you need to show them in the list
        referenceRanges: true 
      }
    });

    return NextResponse.json(parameters);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch parameters" }, { status: 500 });
  }
}

// --- POST: Create New (Same as before, included for completeness) ---
export async function POST(req: Request) {
  try {
    const lab = await prisma.lab.findFirst();
    if (!lab) return NextResponse.json({ error: "No Lab found" }, { status: 404 });

    const body = await req.json();
    const { name, code, unit, inputType, options, ranges } = body;

    if (!name || !code) return NextResponse.json({ error: "Name/Code required" }, { status: 400 });

    const parameter = await prisma.labTestParameter.create({
      data: {
        labId: lab.id,
        name,
        code: code.toUpperCase(),
        unit,
        inputType,
        options: options || [],
        referenceRanges: {
          create: ranges?.map((r: any) => ({
            gender: r.gender,
            minAge: Number(r.minAge) * 365,
            maxAge: Number(r.maxAge) * 365,
            lowValue: r.lowValue ? Number(r.lowValue) : null,
            highValue: r.highValue ? Number(r.highValue) : null,
            criticalLow: r.criticalLow ? Number(r.criticalLow) : null,
            criticalHigh: r.criticalHigh ? Number(r.criticalHigh) : null,
            textValue: r.textValue
          }))
        }
      }
    });

    return NextResponse.json(parameter);
  } catch (error: any) {
    console.error("CREATE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}