import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDataFromToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// =========================================================================
// 1. GET: Fetch Catalog with Fork Hiding Logic (Formatted for Accession)
// =========================================================================
export async function GET(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tests = await prisma.testTemplate.findMany({
      where: {
        isActive: true,
        deletedAt: null, // Ensure we don't fetch soft-deleted tests
        OR: [
          // 1. Fetch all local custom tests/forks for this lab
          { labId: user.labId },
          // 2. Fetch all Global tests... EXCEPT ones this lab has already forked!
          { 
            isGlobal: true,
            forks: { none: { labId: user.labId } }
          }
        ]
      },
      include: {
        TestCategory: { select: { name: true } },
        Department: { select: { name: true } },
        SampleType: { select: { name: true } }, 
        ContainerType: { select: { code: true, capColor: true } },
        _count: { select: { parameters: true } },
        parameters: {
          include: {
            parameter: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const mappedTests = tests.map(test => {
      // Determine type for Accession frontend badge rendering
      let computedType = "SINGLE";
      if (test.type) {
        computedType = test.type;
      } else if (test._count?.parameters > 1) {
        computedType = "PROFILE";
      }

      return {
        id: test.id,
        name: test.name,
        code: test.code,
        type: computedType,
        
        // Exact mapping required for Accession Page Cart
        price: Number(test.price || 0), 
        tat: test.tatHours ? `${test.tatHours} Hours` : "24 Hours",
        sampleType: test.SampleType ? { name: test.SampleType.name } : undefined,
        department: test.Department ? { name: test.Department.name } : undefined,
        
        // Extra metadata for the Datatable / Edit Forms
        isGlobal: test.isGlobal,
        category: test.TestCategory?.name || "Uncategorized",
        departmentId: test.departmentId, 
        sampleTypeId: test.sampleTypeId,
        containerTypeId: test.containerTypeId,
        containerType: test.ContainerType || null,
        method: test.method,
        isActive: test.isActive,
        hasOverride: !!test.forkedFromId, // True if this is a local fork overriding a master test
        parameterCount: test._count?.parameters || 0,
        components: test.parameters 
      };
    });

    return NextResponse.json({ tests: mappedTests }, { status: 200 });
  } catch (error) {
    console.error("Fetch Test Catalog Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// =========================================================================
// 2. PUT: Handle Quick Pricing/Overrides from Datatable
// =========================================================================
export async function PUT(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { testTemplateId, price, isActive, tatHours } = body;

    // 1. Get the original test
    const originalTest = await prisma.testTemplate.findUnique({
      where: { id: testTemplateId },
      include: { parameters: true } // Fetch params so we can clone them if needed
    });

    if (!originalTest) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    // 2. FORKING LOGIC (Enterprise Architecture)
    // If the test is Global, we CANNOT modify it directly. We must create a local Fork.
    if (originalTest.isGlobal) {
      
      // Check if a fork already exists (Safety check)
      const existingFork = await prisma.testTemplate.findFirst({
        where: { labId: user.labId, forkedFromId: testTemplateId }
      });

      if (existingFork) {
         // Update the existing fork
         const updatedFork = await prisma.testTemplate.update({
            where: { id: existingFork.id },
            data: { 
              price: price !== undefined ? parseFloat(price) : existingFork.price,
              isActive: isActive !== undefined ? isActive : existingFork.isActive,
              tatHours: tatHours !== undefined ? parseInt(tatHours) : existingFork.tatHours
            }
         });
         return NextResponse.json({ success: true, test: updatedFork }, { status: 200 });
      }

      // Create a brand new local fork inside a transaction to ensure parameter cloning
      const newFork = await prisma.$transaction(async (tx) => {
          const fork = await tx.testTemplate.create({
            data: {
              labId: user.labId,
              isGlobal: false,
              forkedFromId: testTemplateId,
              
              // Copy metadata
              code: originalTest.code,
              name: originalTest.name,
              printName: originalTest.printName,
              description: originalTest.description,
              method: originalTest.method,
              type: originalTest.type,
              departmentId: originalTest.departmentId,
              sampleTypeId: originalTest.sampleTypeId,
              containerTypeId: originalTest.containerTypeId,
              testCategoryId: originalTest.testCategoryId,
              
              // Apply Overrides
              price: price !== undefined ? parseFloat(price) : originalTest.price,
              tatHours: tatHours !== undefined ? parseInt(tatHours) : originalTest.tatHours,
              isActive: isActive !== undefined ? isActive : originalTest.isActive,
            }
          });

          // Clone parameters to the new fork so it acts as a standalone test
          if (originalTest.parameters && originalTest.parameters.length > 0) {
              await tx.testTemplateParameter.createMany({
                  data: originalTest.parameters.map(p => ({
                      testTemplateId: fork.id,
                      parameterId: p.parameterId,
                      order: p.order
                  }))
              });
          }

          return fork;
      });

      return NextResponse.json({ success: true, test: newFork, isNewFork: true }, { status: 200 });

    } else {
      // If it's ALREADY a local test (or an existing fork), update directly
      if (originalTest.labId !== user.labId) {
         return NextResponse.json({ error: "Unauthorized to edit this test" }, { status: 403 });
      }

      const updatedTest = await prisma.testTemplate.update({
        where: { id: testTemplateId },
        data: {
          price: price !== undefined ? parseFloat(price) : originalTest.price,
          tatHours: tatHours !== undefined ? parseInt(tatHours) : originalTest.tatHours,
          isActive: isActive !== undefined ? isActive : originalTest.isActive,
        }
      });

      return NextResponse.json({ success: true, test: updatedTest }, { status: 200 });
    }

  } catch (error) {
    console.error("Pricing Override Error:", error);
    return NextResponse.json({ error: "Failed to update pricing" }, { status: 500 });
  }
}

// =========================================================================
// 3. DELETE: Handle Local Test Deletion
// =========================================================================
export async function DELETE(req: NextRequest) {
  try {
    const user = await getDataFromToken(req);
    if (!user || !user.labId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("id");

    if (!testId) return NextResponse.json({ error: "Test ID is required" }, { status: 400 });

    const test = await prisma.testTemplate.findUnique({ where: { id: testId } });
    
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });
    if (test.isGlobal) return NextResponse.json({ error: "Cannot delete global master tests." }, { status: 403 });
    if (test.labId !== user.labId) return NextResponse.json({ error: "Unauthorized to delete this test" }, { status: 403 });

    // Use Soft Delete (Enterprise Best Practice)
    await prisma.testTemplate.update({
      where: { id: testId },
      data: { deletedAt: new Date(), isActive: false }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete Test Error:", error);
    return NextResponse.json({ error: "Failed to delete test" }, { status: 500 });
  }
}