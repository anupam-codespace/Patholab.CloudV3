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
      if (existingTest.labId !== user.labId) {
        return NextResponse.json({ error: "Unauthorized to edit this test" }, { status: 403 });
      }

      const updatedLocalTest = await prisma.$transaction(async (tx) => {
        // 1. Update core details
        const updated = await tx.testTemplate.update({
          where: { id: testTemplateId },
          data: {
            name: body.name,
            code: body.code,
            printName: body.printName || null,
            departmentId: body.departmentId,
            sampleTypeId: body.sampleTypeId,
            containerTypeId: body.containerTypeId || null,
            price: body.price,
            b2bPrice: body.b2bPrice || 0,
            cost: body.cost || 0,
            tat: body.tat,
            method: body.method,
            isActive: body.isActive
          }
        });

        // 2. Wipe old parameters
        await tx.testTemplateParameter.deleteMany({
          where: { templateId: testTemplateId }
        });

        // 3. Insert newly arranged parameters
        if (body.components && body.components.length > 0) {
          await tx.testTemplateParameter.createMany({
            data: body.components.map((c: any) => ({
              templateId: testTemplateId,
              parameterId: c.parameterId,
              headingId: c.headingId,
              order: c.order
            }))
          });
        }

        return updated;
      });

      return NextResponse.json({ success: true, forked: false, test: updatedLocalTest });
    }

    // ==========================================
    // SCENARIO B: Editing a GLOBAL test
    // ==========================================
    
    // 2. Diff Check: Did they change core clinical details, or just the price?
    const isCoreChanged = 
      body.name !== existingTest.name ||
      body.code !== existingTest.code ||
      body.departmentId !== existingTest.departmentId ||
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
          tat: body.tat,
          isActive: body.isActive
        },
        create: {
          labId: user.labId,
          testTemplateId: testTemplateId,
          price: body.price,
          b2bPrice: body.b2bPrice || 0,
          cost: body.cost || 0,
          tat: body.tat,
          isActive: body.isActive !== undefined ? body.isActive : true
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
          isGlobal: false,         
          forkedFromId: existingTest.id, // 🔗 THE SECRET LINK: This hides the global duplicate!
          name: body.name,
          code: body.code, 
          printName: body.printName || null,
          price: body.price,
          b2bPrice: body.b2bPrice || 0,
          cost: body.cost || 0,
          tat: body.tat,
          method: body.method,
          type: existingTest.type,
          categoryId: existingTest.categoryId,
          departmentId: body.departmentId,
          sampleTypeId: body.sampleTypeId,
          containerTypeId: body.containerTypeId || null,
          isActive: body.isActive
        }
      });

      // 2. Clone the Parameters from the form submission
      if (body.components && body.components.length > 0) {
        await tx.testTemplateParameter.createMany({
          data: body.components.map((c: any) => ({
            templateId: cloned.id,
            parameterId: c.parameterId,
            headingId: c.headingId,
            order: c.order
          }))
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