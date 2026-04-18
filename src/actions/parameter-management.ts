'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ParameterInputType, Gender } from '@prisma/client';

async function getLabId() {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");
  return user.labId;
}

// --- 1. GET ALL PARAMETERS ---
export async function getParameters() {
  const labId = await getLabId();
  return await prisma.labTestParameter.findMany({
    where: { labId },
    orderBy: { name: 'asc' },
    include: {
      referenceRanges: true,
      containerType: true,
      reagents: { include: { inventoryItem: true } } // ✅ ADDED: Fetch mapped reagents
    }
  });
}

// --- 2. CREATE PARAMETER ---
export async function createParameter(data: {
  name: string;
  code: string;
  unit?: string;
  printName?: string;
  inputType: ParameterInputType;
  price?: number;
  decimals?: number;
  method?: string;
  formula?: string;
  containerTypeId?: string;
  options?: string[];
  ranges: {
    gender: Gender;
    minAge: number;
    maxAge: number;
    ageUnit: string;
    lowValue?: number;
    highValue?: number;
    criticalLow?: number;
    criticalHigh?: number;
    textValue?: string;
    customLabel?: string; 
  }[];
  // ✅ ADDED: Reagents Array Type
  reagents?: {
    inventoryItemId: string;
    quantity: number;
  }[];
}) {
  const labId = await getLabId();

  await prisma.$transaction(async (tx) => {
    const parameter = await tx.labTestParameter.create({
      data: {
        labId,
        name: data.name,
        code: data.code.toUpperCase(),
        printName: data.printName || data.name,
        unit: data.unit,
        inputType: data.inputType,
        price: data.price || 0,
        decimals: data.decimals || 2,
        method: data.method,
        formula: data.formula,
        containerTypeId: data.containerTypeId || null,
        options: data.options || [],
      }
    });

    if (data.ranges && data.ranges.length > 0) {
      await tx.parameterReferenceRange.createMany({
        data: data.ranges.map(range => ({
          parameterId: parameter.id,
          gender: range.gender,
          minAge: range.minAge,
          maxAge: range.maxAge,
          ageUnit: range.ageUnit,
          lowValue: range.lowValue ?? null,
          highValue: range.highValue ?? null,
          criticalLow: range.criticalLow ?? null,
          criticalHigh: range.criticalHigh ?? null,
          textValue: range.textValue || null,
          customLabel: range.customLabel || null, 
        }))
      });
    }

    // ✅ ADDED: Create Reagent Mappings
    if (data.reagents && data.reagents.length > 0) {
      await tx.testParameterReagent.createMany({
        data: data.reagents.map(reagent => ({
          parameterId: parameter.id,
          inventoryItemId: reagent.inventoryItemId,
          quantity: reagent.quantity
        }))
      });
    }
  });

  revalidatePath('/workspace/test-management');
}

// --- 3. UPDATE PARAMETER ---
export async function updateParameter(id: string, data: {
    name: string;
    code: string;
    unit?: string;
    printName?: string;
    inputType: ParameterInputType;
    price?: number;
    decimals?: number;
    method?: string;
    formula?: string;
    containerTypeId?: string;
    options?: string[];
    ranges: {
      gender: Gender;
      minAge: number;
      maxAge: number;
      ageUnit: string;
      lowValue?: number;
      highValue?: number;
      criticalLow?: number;
      criticalHigh?: number;
      textValue?: string;
      customLabel?: string; 
    }[];
    // ✅ ADDED: Reagents Array Type
    reagents?: {
      inventoryItemId: string;
      quantity: number;
    }[];
  }) {
    const labId = await getLabId(); 
  
    await prisma.$transaction(async (tx) => {
      // 1. Update Parent
      await tx.labTestParameter.update({
        where: { id, labId }, 
        data: {
          name: data.name,
          code: data.code.toUpperCase(),
          printName: data.printName || data.name,
          unit: data.unit,
          inputType: data.inputType,
          price: data.price || 0,
          decimals: data.decimals || 2,
          method: data.method,
          formula: data.formula,
          containerTypeId: data.containerTypeId || null,
          options: data.options || [],
        }
      });
  
      // 2. Wipe & Replace Ranges
      await tx.parameterReferenceRange.deleteMany({
        where: { parameterId: id }
      });
  
      if (data.ranges && data.ranges.length > 0) {
        await tx.parameterReferenceRange.createMany({
          data: data.ranges.map(range => ({
            parameterId: id,
            gender: range.gender,
            minAge: range.minAge,
            maxAge: range.maxAge,
            ageUnit: range.ageUnit,
            lowValue: range.lowValue ?? null,
            highValue: range.highValue ?? null,
            criticalLow: range.criticalLow ?? null,
            criticalHigh: range.criticalHigh ?? null,
            textValue: range.textValue || null,
            customLabel: range.customLabel || null, 
          }))
        });
      }

      // ✅ ADDED: Wipe & Replace Reagent Mappings
      await tx.testParameterReagent.deleteMany({
        where: { parameterId: id }
      });

      if (data.reagents && data.reagents.length > 0) {
        await tx.testParameterReagent.createMany({
          data: data.reagents.map(reagent => ({
            parameterId: id,
            inventoryItemId: reagent.inventoryItemId,
            quantity: reagent.quantity
          }))
        });
      }
    });
  
    revalidatePath('/workspace/test-management');
  }

// --- 4. DELETE PARAMETER ---
export async function deleteParameter(id: string) {
  const labId = await getLabId();
  await prisma.labTestParameter.delete({
    where: { id, labId }
  });
  revalidatePath('/workspace/test-management');
}