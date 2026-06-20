import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth"; // Upgraded to secure session

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.labId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const testTemplateId = params.id;
    const body = await req.json();
    
    // 1. Fetch the existing test to see if it's Global or Local
    const existingTest = await prisma.testTemplate.findUnique({
      where: { id: testTemplateId },
      include: { parameters: { orderBy: { order: 'asc' } } }
    });

    if (!existingTest) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    // Safely parse numbers based on schema expectations
    const tatHours = body.tatHours ? parseInt(body.tatHours) : (body.tat ? parseInt(body.tat) : 24);
    const price = body.price ? parseFloat(body.price) : 0;

    // ==========================================
    // SCENARIO A: Editing an already LOCAL test
    // ==========================================
    if (!existingTest.isGlobal) {
      if (existingTest.labId !== user.labId) {
        return NextResponse.json({ error: "Unauthorized to edit this test" }, { status: 403 });
      }

      const updatedLocalTest = await prisma.$transaction(async (tx) => {
        // 1. Update core details (Strictly mapped to TestTemplate schema)
        const updated = await tx.testTemplate.update({
          where: { id: testTemplateId },
          data: {
            name: body.name,
            code: body.code,
            printName: body.printName || null,
            departmentId: body.departmentId || null,
            sampleTypeId: body.sampleTypeId || null,
            containerTypeId: body.containerTypeId || null,
            testCategoryId: body.testCategoryId || existingTest.testCategoryId || null, 
            price: price,
            tatHours: tatHours,
            method: body.method || null,
            isActive: body.isActive !== undefined ? body.isActive : true
          }
        });

        // 2. Wipe old parameters (Using correct testTemplateId)
        await tx.testTemplateParameter.deleteMany({
          where: { testTemplateId: testTemplateId }
        });

        // 3. Insert newly arranged parameters
        if (body.components && body.components.length > 0) {
          await tx.testTemplateParameter.createMany({
            data: body.components.map((c: any) => ({
              testTemplateId: testTemplateId, // Correctly mapped
              parameterId: c.parameterId,
              order: c.order || 0
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
      const b2bPrice = body.b2bPrice ? parseFloat(body.b2bPrice) : 0;
      const cost = body.cost ? parseFloat(body.cost) : 0;

      // Because LabTestPricing doesn't have a unique constraint, we use findFirst + update/create
      const existingPricing = await prisma.labTestPricing.findFirst({
        where: { labId: user.labId, testTemplateId: testTemplateId }
      });

      if (existingPricing) {
        await prisma.labTestPricing.update({
          where: { id: existingPricing.id },
          data: {
            price: price,
            b2bPrice: b2bPrice,
            cost: cost,
            tat: tatHours.toString(), // Schema uses string for pricing TAT
            isActive: body.isActive !== undefined ? body.isActive : true
          }
        });
      } else {
        await prisma.labTestPricing.create({
          data: {
            labId: user.labId,
            testTemplateId: testTemplateId,
            price: price,
            b2bPrice: b2bPrice,
            cost: cost,
            tat: tatHours.toString(),
            isActive: body.isActive !== undefined ? body.isActive : true
          }
        });
      }

      return NextResponse.json({ 
        success: true, 
        forked: false, 
        message: "Global test retained. Custom pricing applied." 
      });
    }

    // SCENARIO B2: CORE DETAILS CHANGED -> Fork into a Local Test
    const newLocalTest = await prisma.$transaction(async (tx) => {
      // 1. Create the new local clone (Strictly mapped to TestTemplate schema)
      const cloned = await tx.testTemplate.create({
        data: {
          labId: user.labId,
          isGlobal: false,         
          forkedFromId: existingTest.id, // 🔗 THE SECRET LINK: This hides the global duplicate!
          name: body.name,
          code: body.code, 
          printName: body.printName || null,
          price: price,
          tatHours: tatHours,
          method: body.method || null,
          type: existingTest.type,
          testCategoryId: body.testCategoryId || existingTest.testCategoryId || null,
          departmentId: body.departmentId || null,
          sampleTypeId: body.sampleTypeId || null,
          containerTypeId: body.containerTypeId || null,
          isActive: body.isActive !== undefined ? body.isActive : true
        }
      });

      // 2. Clone the Parameters from the form submission
      if (body.components && body.components.length > 0) {
        await tx.testTemplateParameter.createMany({
          data: body.components.map((c: any) => ({
            testTemplateId: cloned.id, // Correctly mapped
            parameterId: c.parameterId,
            order: c.order || 0
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
    console.error("[UPDATE_TEST_CATALOG_ERROR]", error);
    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
  }
}