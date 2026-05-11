import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// ==========================================
// 1. GET: Fetch Catalog with Deep Includes
// ==========================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tests = await prisma.testTemplate.findMany({
      where: {
        OR: [
          { isGlobal: true },
          { labId: user.labId }
        ]
      },
      include: {
        category: { select: { name: true } },
        department: { select: { name: true } },
        containerType: { select: { code: true, capColor: true } },
        _count: { select: { parameters: true } },
        labPricing: {
          where: { labId: user.labId },
          select: { price: true, b2bPrice: true, tat: true, isActive: true }
        },
        // 👇 The Deep Fetch for Auto-Reagents
        parameters: {
          include: {
            parameter: {
              include: {
                reagents: {
                  include: {
                    inventoryItem: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const mappedTests = tests.map(test => {
      const override = test.labPricing[0]; 
      return {
        id: test.id,
        name: test.name,
        code: test.code,
        type: test.type,
        isGlobal: test.isGlobal,
        category: test.category?.name || "Uncategorized",
        department: test.department || null,
        containerType: test.containerType || null,
        _count: test._count,
        price: Number(test.price), // Keep base price for reference
        effectivePrice: override ? Number(override.price) : Number(test.price),
        effectiveB2BPrice: override && override.b2bPrice ? Number(override.b2bPrice) : Number(test.b2bPrice || 0),
        effectiveTat: override?.tat || test.tat || "24 Hours",
        isActive: override ? override.isActive : test.isActive,
        hasOverride: !!override,
        components: test.parameters // Map for the UI
      };
    });

    return NextResponse.json({ tests: mappedTests }, { status: 200 });
  } catch (error) {
    console.error("Fetch Test Catalog Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ==========================================
// 2. PUT: Handle Quick Pricing Overrides
// ==========================================
export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { testTemplateId, price, b2bPrice, tat, isActive } = body;

    const pricingOverride = await prisma.labTestPricing.upsert({
      where: {
        labId_testTemplateId: {
          labId: user.labId,
          testTemplateId: testTemplateId
        }
      },
      update: {
        price: parseFloat(price),
        b2bPrice: parseFloat(b2bPrice || 0),
        tat: tat,
        isActive: isActive
      },
      create: {
        labId: user.labId,
        testTemplateId: testTemplateId,
        price: parseFloat(price),
        b2bPrice: parseFloat(b2bPrice || 0),
        tat: tat,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json({ success: true, pricingOverride }, { status: 200 });
  } catch (error) {
    console.error("Pricing Override Error:", error);
    return NextResponse.json({ error: "Failed to update pricing" }, { status: 500 });
  }
}

// ==========================================
// 3. DELETE: Handle Local Test Deletion
// ==========================================
export async function DELETE(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Extract ID from the URL query params: /api/workspace/test-catalog?id=123
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("id");

    if (!testId) return NextResponse.json({ error: "Test ID is required" }, { status: 400 });

    // Ensure they aren't trying to delete a global test
    const test = await prisma.testTemplate.findUnique({ where: { id: testId } });
    
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });
    if (test.isGlobal) return NextResponse.json({ error: "Cannot delete global tests" }, { status: 403 });
    if (test.labId !== user.labId) return NextResponse.json({ error: "Unauthorized to delete this test" }, { status: 403 });

    // Delete the local test
    await prisma.testTemplate.delete({
      where: { id: testId }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete Test Error:", error);
    return NextResponse.json({ error: "Failed to delete test" }, { status: 500 });
  }
}