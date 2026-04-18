'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function getLabId() {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");
  return user.labId;
}

export async function getTests() {
  const labId = await getLabId();
  
  const tests = await prisma.testTemplate.findMany({
    where: { department: { labId } },
    include: {
      department: true,
      sampleType: true,
      containerType: true, // ✅ FETCH TUBE INFO
      parameters: {
        include: {parameter: {
            // ✅ ADDED: Fetch the reagents for each parameter inside the test
            include: { reagents: { include: { inventoryItem: true } } }
          } },
        orderBy: { order: 'asc' }
      },
      customFields: {
        include: { fieldDef: true },
        orderBy: { order: 'asc' }
      },
      _count: { select: { parameters: true } }
    },
    orderBy: { name: 'asc' }
  });

  return tests.map(test => ({
    ...test,
    components: test.parameters 
  }));
}

export async function createTest(data: {
  name: string;
  code: string;
  printName?: string;
  departmentId: string;
  sampleTypeId: string;
  containerTypeId?: string; // ✅ NEW FIELD
  price: number;
  b2bPrice?: number;
  cost?: number; 
  tat?: string;
  method?: string;
  isActive: boolean;
  components: {
    parameterId: string;
    headingId?: string; 
    order: number;
  }[];
  customFieldIds?: string[];
}) {
  await getLabId(); 

  await prisma.$transaction(async (tx) => {
    const test = await tx.testTemplate.create({
      data: {
        name: data.name,
        code: data.code,
        printName: data.printName || data.name,
        departmentId: data.departmentId,
        sampleTypeId: data.sampleTypeId,
        
        // ✅ SAVE TUBE LINK
        containerTypeId: data.containerTypeId || null,

        price: data.price,
        b2bPrice: data.b2bPrice || 0,
        cost: data.cost || 0,
        tat: data.tat,
        method: data.method,
        isActive: data.isActive,
        type: data.components.length > 1 ? 'PROFILE' : 'SINGLE',
      }
    });

    if (data.components.length > 0) {
      await tx.testTemplateParameter.createMany({
        data: data.components.map((comp, index) => ({
          templateId: test.id,
          parameterId: comp.parameterId,
          headingId: comp.headingId || null,
          order: index + 1,
        }))
      });
    }

    if (data.customFieldIds && data.customFieldIds.length > 0) {
        await tx.testTemplateField.createMany({
            data: data.customFieldIds.map((fieldDefId, index) => ({
                templateId: test.id,
                fieldDefId: fieldDefId,
                order: index
            }))
        });
    }
  });

  revalidatePath('/workspace/test-management');
}

export async function updateTest(id: string, data: {
    name: string;
    code: string;
    printName?: string;
    departmentId: string;
    sampleTypeId: string;
    containerTypeId?: string; // ✅ NEW FIELD
    price: number;
    b2bPrice?: number;
    cost?: number;
    tat?: string;
    method?: string;
    isActive: boolean;
    components: {
      parameterId: string;
      headingId?: string;
      order: number;
    }[];
    customFieldIds?: string[];
  }) {
    await getLabId(); 
  
    const departmentId = (data.departmentId && data.departmentId.trim() !== "") ? data.departmentId : undefined;
    const sampleTypeId = (data.sampleTypeId && data.sampleTypeId.trim() !== "") ? data.sampleTypeId : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.testTemplate.update({
        where: { id },
        data: {
          name: data.name,
          code: data.code,
          printName: data.printName || data.name,
          ...(departmentId && { departmentId }),
          ...(sampleTypeId && { sampleTypeId }),
          
          // ✅ UPDATE TUBE LINK
          containerTypeId: data.containerTypeId || null,

          price: data.price,
          b2bPrice: data.b2bPrice || 0,
          cost: data.cost || 0,
          tat: data.tat,
          method: data.method,
          isActive: data.isActive,
          type: data.components.length > 1 ? 'PROFILE' : 'SINGLE', 
        }
      });
  
      await tx.testTemplateParameter.deleteMany({ where: { templateId: id } });
      if (data.components.length > 0) {
        await tx.testTemplateParameter.createMany({
          data: data.components.map((comp, index) => ({
            templateId: id,
            parameterId: comp.parameterId,
            headingId: comp.headingId || null,
            order: index + 1,
          }))
        });
      }

      await tx.testTemplateField.deleteMany({ where: { templateId: id } });
      if (data.customFieldIds && data.customFieldIds.length > 0) {
        await tx.testTemplateField.createMany({
            data: data.customFieldIds.map((fieldDefId, index) => ({
                templateId: id,
                fieldDefId: fieldDefId,
                order: index
            }))
        });
      }
    });
  
    revalidatePath('/workspace/test-management');
}

export async function deleteTest(id: string) {
    await prisma.testTemplate.delete({ where: { id } });
    revalidatePath('/workspace/test-management');
}