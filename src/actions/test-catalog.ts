'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function getLabId() {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");
  return user.labId;
}

// ==========================================
// 1. GET TESTS (With Fork Hiding Logic)
// ==========================================
export async function getTests() {
  const labId = await getLabId();
  
  const tests = await prisma.testTemplate.findMany({
    where: { 
      deletedAt: null, // ✅ Hide soft-deleted tests
      OR: [
        { labId: labId },
        { 
          isGlobal: true,
          forks: { none: { labId: labId } } // 🔗 Hides global tests if the lab already forked them
        }
      ]
    },
    include: {
      // ✅ Capitalized relations matching the schema
      Department: true,
      SampleType: true,
      ContainerType: true,
      parameters: {
        include: {
          parameter: {
            include: { reagents: { include: { inventoryItem: true } } }
          } 
        },
        orderBy: { order: 'asc' }
      },
      customFields: {
        include: { field: true }, // ✅ Updated to 'field' instead of 'fieldDef'
        orderBy: { order: 'asc' }
      },
      _count: { select: { parameters: true } }
    },
    orderBy: { name: 'asc' }
  });

  // Map the capitalized relations back to lowercase for the frontend components
  return tests.map(test => ({
    ...test,
    department: test.Department,
    sampleType: test.SampleType,
    containerType: test.ContainerType,
    components: test.parameters 
  }));
}

// ==========================================
// 2. CREATE TEST
// ==========================================
export async function createTest(data: {
  name: string;
  code: string;
  printName?: string;
  departmentId: string;
  sampleTypeId: string;
  containerTypeId?: string; 
  price: number;
  tat?: string;
  method?: string;
  isActive: boolean;
  components: {
    parameterId: string;
    order: number;
  }[];
  customFieldIds?: string[];
}) {
  const labId = await getLabId(); 

  // ✅ SAFELY PARSE FOREIGN KEYS
  const validDepartmentId = data.departmentId && data.departmentId !== "generic" && data.departmentId.trim() !== "" ? data.departmentId : null;
  const validSampleTypeId = data.sampleTypeId && data.sampleTypeId !== "generic" && data.sampleTypeId.trim() !== "" ? data.sampleTypeId : null;
  const validContainerTypeId = data.containerTypeId && data.containerTypeId !== "generic" && data.containerTypeId.trim() !== "" ? data.containerTypeId : null;

  await prisma.$transaction(async (tx) => {
    const test = await tx.testTemplate.create({
      data: {
        labId,
        isGlobal: false,
        name: data.name,
        code: data.code,
        printName: data.printName || data.name,
        departmentId: validDepartmentId,
        sampleTypeId: validSampleTypeId,
        containerTypeId: validContainerTypeId,
        price: data.price,
        tatHours: parseInt(data.tat || '24') || 24, // ✅ Convert string TAT to Schema Int
        method: data.method,
        isActive: data.isActive,
        type: data.components.length > 1 ? 'PROFILE' : 'SINGLE',
      }
    });

    if (data.components.length > 0) {
      await tx.testTemplateParameter.createMany({
        data: data.components.map((comp, index) => ({
          testTemplateId: test.id, // ✅ Fixed relation name
          parameterId: comp.parameterId,
          order: index + 1,
        }))
      });
    }

    if (data.customFieldIds && data.customFieldIds.length > 0) {
        await tx.testTemplateCustomField.createMany({ // ✅ Fixed model name
            data: data.customFieldIds.map((fieldDefId, index) => ({
                templateId: test.id,
                fieldId: fieldDefId, // ✅ Fixed field reference
                order: index
            }))
        });
    }
  });

  revalidatePath('/workspace/test-management');
}

// ==========================================
// 3. UPDATE OR FORK TEST
// ==========================================
export async function updateTest(id: string, data: {
    name: string;
    code: string;
    printName?: string;
    departmentId: string;
    sampleTypeId: string;
    containerTypeId?: string; 
    price: number;
    tat?: string;
    method?: string;
    isActive: boolean;
    components: {
      parameterId: string;
      order: number;
    }[];
    customFieldIds?: string[];
  }) {
    const labId = await getLabId(); 
  
    // ✅ SAFELY PARSE FOREIGN KEYS
    const validDepartmentId = data.departmentId && data.departmentId !== "generic" && data.departmentId.trim() !== "" ? data.departmentId : null;
    const validSampleTypeId = data.sampleTypeId && data.sampleTypeId !== "generic" && data.sampleTypeId.trim() !== "" ? data.sampleTypeId : null;
    const validContainerTypeId = data.containerTypeId && data.containerTypeId !== "generic" && data.containerTypeId.trim() !== "" ? data.containerTypeId : null;

    const existingTest = await prisma.testTemplate.findUnique({ where: { id } });
    if (!existingTest) throw new Error("Test not found");

    await prisma.$transaction(async (tx) => {
      
      // --- SCENARIO A: FORK GLOBAL TEST ---
      if (existingTest.isGlobal) {
        const clonedTest = await tx.testTemplate.create({
          data: {
            labId,
            isGlobal: false,
            forkedFromId: existingTest.id, // 🔗 Links to master
            name: data.name,
            code: data.code,
            printName: data.printName || data.name,
            departmentId: validDepartmentId,
            sampleTypeId: validSampleTypeId,
            containerTypeId: validContainerTypeId,
            price: data.price,
            tatHours: parseInt(data.tat || '24') || 24,
            method: data.method,
            isActive: data.isActive,
            type: data.components.length > 1 ? 'PROFILE' : 'SINGLE',
          }
        });

        if (data.components.length > 0) {
          await tx.testTemplateParameter.createMany({
            data: data.components.map((comp, index) => ({
              testTemplateId: clonedTest.id, 
              parameterId: comp.parameterId,
              order: index + 1,
            }))
          });
        }
    
        if (data.customFieldIds && data.customFieldIds.length > 0) {
            await tx.testTemplateCustomField.createMany({ 
                data: data.customFieldIds.map((fieldDefId, index) => ({
                    templateId: clonedTest.id,
                    fieldId: fieldDefId, 
                    order: index
                }))
            });
        }
      } 
      
      // --- SCENARIO B: DEEP UPDATE LOCAL TEST ---
      else {
        if (existingTest.labId !== labId) throw new Error("Unauthorized to edit this test");

        await tx.testTemplate.update({
          where: { id },
          data: {
            name: data.name,
            code: data.code,
            printName: data.printName || data.name,
            departmentId: validDepartmentId,
            sampleTypeId: validSampleTypeId,
            containerTypeId: validContainerTypeId,
            price: data.price,
            tatHours: parseInt(data.tat || '24') || 24,
            method: data.method,
            isActive: data.isActive,
            type: data.components.length > 1 ? 'PROFILE' : 'SINGLE', 
          }
        });
    
        await tx.testTemplateParameter.deleteMany({ where: { testTemplateId: id } });
        if (data.components.length > 0) {
          await tx.testTemplateParameter.createMany({
            data: data.components.map((comp, index) => ({
              testTemplateId: id,
              parameterId: comp.parameterId,
              order: index + 1,
            }))
          });
        }

        await tx.testTemplateCustomField.deleteMany({ where: { templateId: id } });
        if (data.customFieldIds && data.customFieldIds.length > 0) {
          await tx.testTemplateCustomField.createMany({
              data: data.customFieldIds.map((fieldDefId, index) => ({
                  templateId: id,
                  fieldId: fieldDefId,
                  order: index
              }))
          });
        }
      }
    });
  
    revalidatePath('/workspace/test-management');
}

// ==========================================
// 4. DELETE TEST
// ==========================================
export async function deleteTest(id: string) {
    const labId = await getLabId();
    
    const existingTest = await prisma.testTemplate.findUnique({ where: { id } });
    if (!existingTest) throw new Error("Test not found");
    if (existingTest.isGlobal) throw new Error("Cannot delete Global Master Test");
    if (existingTest.labId !== labId) throw new Error("Unauthorized");

    // ✅ SOFT DELETE: Required for Enterprise Apps to keep historical invoices intact
    await prisma.testTemplate.update({ 
      where: { id },
      data: { deletedAt: new Date(), isActive: false }
    });
    
    revalidatePath('/workspace/test-management');
}