import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to get ID from params
// Note: In Next.js App Router, params is a Promise or object depending on version. 
// We destructure it from the second argument.

// --- GET: Fetch Single Parameter (For Edit Page) ---
export async function GET(
  req: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const parameter = await prisma.labTestParameter.findUnique({
      where: { id: params.id },
      include: { referenceRanges: true } // Need ranges to populate the edit form
    });

    if (!parameter) {
      return NextResponse.json({ error: "Parameter not found" }, { status: 404 });
    }

    return NextResponse.json(parameter);
  } catch (error) {
    return NextResponse.json({ error: "Fetch error" }, { status: 500 });
  }
}

// --- PUT: Update Parameter & Ranges ---
export async function PUT(
  req: Request, 
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { name, code, unit, inputType, options, ranges } = body;

    // We use a transaction to ensure clean updates of the ranges
    const updatedParameter = await prisma.$transaction(async (tx) => {
      
      // 1. Update basic fields
      const p = await tx.labTestParameter.update({
        where: { id: params.id },
        data: {
          name,
          code: code.toUpperCase(),
          unit,
          inputType,
          options: options || [],
        }
      });

      // 2. Delete OLD ranges (Reset)
      await tx.parameterReferenceRange.deleteMany({
        where: { parameterId: params.id }
      });

      // 3. Create NEW ranges
      if (ranges && ranges.length > 0) {
        await tx.parameterReferenceRange.createMany({
          data: ranges.map((r: any) => ({
            parameterId: p.id,
            gender: r.gender,
            minAge: Number(r.minAge) * 365,
            maxAge: Number(r.maxAge) * 365,
            lowValue: r.lowValue ? Number(r.lowValue) : null,
            highValue: r.highValue ? Number(r.highValue) : null,
            criticalLow: r.criticalLow ? Number(r.criticalLow) : null,
            criticalHigh: r.criticalHigh ? Number(r.criticalHigh) : null,
            textValue: r.textValue
          }))
        });
      }

      return p;
    });

    return NextResponse.json(updatedParameter);
  } catch (error: any) {
    console.error("UPDATE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- DELETE: Remove Parameter ---
export async function DELETE(
  req: Request, 
  { params }: { params: { id: string } }
) {
  try {
    // 1. Safety Check: Is this parameter used in any existing Test Bundle?
    const usageCount = await prisma.testTemplateParameter.count({
      where: { parameterId: params.id }
    });

    if (usageCount > 0) {
      return NextResponse.json({ 
        error: "Cannot delete: This parameter is currently used in test bundles." 
      }, { status: 400 });
    }

    // 2. Delete (Cascading delete will handle ranges automatically)
    await prisma.labTestParameter.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}