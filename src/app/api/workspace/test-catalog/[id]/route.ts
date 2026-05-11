import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const testTemplateId = params.id;
    const body = await req.json();
    
    // 1. Fetch the existing test to see if it's Global or Local
    const existingTest = await prisma.testTemplate.findUnique({
      where: { id: testTemplateId },
      include: { parameters: { orderBy: { order: 'asc' } } }
    });

    if (!existingTest) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    // ==========================================
    // SCENARIO A: Editing an already LOCAL test
    // ==========================================
    if (!existingTest.isGlobal) {
      const updatedLocalTest = await prisma.testTemplate.update({
        where: { id: testTemplateId },
        data: {
          name: body.name,
          price: body.price,
          b2bPrice: body.b2bPrice,
          cost: body.cost,
          sampleTypeId: body.sampleTypeId,
          containerTypeId: body.containerTypeId,
          tat: body.tat,
          method: body.method,
        }
      });
      return NextResponse.json({ success: true, forked: false, test: updatedLocalTest });
    }

    // ==========================================
    // SCENARIO B: Editing a GLOBAL test
    // ==========================================
    
    // 2. Diff Check: Did they change core clinical details, or just the price?
    const isCoreChanged = 
      body.name !== existingTest.name ||
      body.sampleTypeId !== existingTest.sampleTypeId ||
      body.containerTypeId !== existingTest.containerTypeId ||
      body.method !== existingTest.method ||
      body.parametersChanged === true; // Flag from frontend if params were touched

    if (!isCoreChanged) {
      // SCENARIO B1: ONLY PRICE CHANGED -> Create an Override via LabTestPricing
      await prisma.labTestPricing.upsert({
        where: { labId_testTemplateId: { labId: user.labId, testTemplateId: testTemplateId } },
        update: {
          price: body.price,
          b2bPrice: body.b2bPrice || 0,
          cost: body.cost || 0,
          tat: body.tat
        },
        create: {
          labId: user.labId,
          testTemplateId: testTemplateId,
          price: body.price,
          b2bPrice: body.b2bPrice || 0,
          cost: body.cost || 0,
          tat: body.tat
        }
      });

      return NextResponse.json({ 
        success: true, 
        forked: false, 
        message: "Global test retained. Custom pricing applied." 
      });
    }

    // SCENARIO B2: CORE DETAILS CHANGED -> Fork into a Local Test
    const newLocalTest = await prisma.$transaction(async (tx) => {
      // 1. Create the new local clone
      const cloned = await tx.testTemplate.create({
        data: {
          labId: user.labId,
          isGlobal: false,         // ✅ Explicitly local
          name: body.name,
          code: existingTest.code, 
          price: body.price,
          b2bPrice: body.b2bPrice,
          cost: body.cost,
          tat: body.tat,
          method: body.method,
          type: existingTest.type,
          categoryId: existingTest.categoryId,
          departmentId: existingTest.departmentId,
          sampleTypeId: body.sampleTypeId,
          containerTypeId: body.containerTypeId,
        }
      });

      // 2. Clone the Parameters
      const paramsToClone = body.parameters || existingTest.parameters;
      
      for (const p of paramsToClone) {
        await tx.testTemplateParameter.create({
          data: {
            templateId: cloned.id,
            parameterId: p.parameterId,
            order: p.order
          }
        });
      }

      return cloned;
    });

    return NextResponse.json({ 
      success: true, 
      forked: true, 
      test: newLocalTest,
      message: "Global test modified. A custom local copy has been created for your lab." 
    });

  } catch (error) {
    console.error("Update Test Catalog Error:", error);
    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
  }
}