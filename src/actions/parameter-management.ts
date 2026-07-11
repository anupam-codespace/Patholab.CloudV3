'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { Gender } from '@prisma/client';

async function getLabId() {
  const user = await getCurrentUser();
  if (!user?.labId) throw new Error("Unauthorized");
  return user.labId;
}

// --- 1. GET ALL PARAMETERS ---
export async function getParameters() {
  const labId = await getLabId();
  return await prisma.labTestParameter.findMany({
    where: { 
      isActive: true, 
      OR: [
        { labId: labId },
        { 
          isGlobal: true,
         
        }
      ]
    },
    orderBy: { name: 'asc' },
    include: {
      referenceRanges: true,
      containerType: true,
      reagents: { include: { inventoryItem: true } } ,
      forkedFrom: { select: { name: true, code: true } }
    }
  });
}

// --- 2. CREATE PARAMETER ---
// --- 2. CREATE PARAMETER ---
export async function createParameter(data: {
  name: string;
  code: string;
  price?: number;    // ✅ Fixed location
  decimals?: number; // ✅ Fixed location
  unit?: string;
  printName?: string;
  method?: string;
  formula?: string;
  containerTypeId?: string;
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
  reagents?: {
    inventoryItemId: string;
    quantity: number;
  }[];
}) {
  const labId = await getLabId();
  const codeUpper = data.code.toUpperCase();

  const validContainerId = data.containerTypeId && data.containerTypeId !== "generic" && data.containerTypeId.trim() !== "" 
    ? data.containerTypeId 
    : null;

  const existingCode = await prisma.labTestParameter.findFirst({
    where: { labId, code: codeUpper, isActive: true }
  });
  
  if (existingCode) {
    return { error: `A parameter with the short code '${codeUpper}' already exists in your lab.` };
  }

  await prisma.$transaction(async (tx) => {
    const parameter = await tx.labTestParameter.create({
      data: {
        labId,
        isGlobal: false, 
        name: data.name,
        code: codeUpper,
        printName: data.printName || data.name,
        price: data.price || 0,       // ✅ Saving to database
        decimals: data.decimals || 2, // ✅ Saving to database
        unit: data.unit || null,
        method: data.method || null,
        formula: data.formula || null,
        containerTypeId: validContainerId,
        isActive: true
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
  return { success: true };
}

// --- 3. UPDATE OR FORK PARAMETER ---
// --- 3. UPDATE OR FORK PARAMETER ---
export async function updateParameter(id: string, data: {
    name: string;
    code: string;
    price?: number;    // ✅ Fixed location
    decimals?: number; // ✅ Fixed location
    unit?: string;
    printName?: string;
    method?: string;
    formula?: string;
    containerTypeId?: string;
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
    reagents?: {
      inventoryItemId: string;
      quantity: number;
    }[];
  }) {
    const labId = await getLabId(); 
    const codeUpper = data.code.toUpperCase();

    const validContainerId = data.containerTypeId && data.containerTypeId !== "generic" && data.containerTypeId.trim() !== "" 
      ? data.containerTypeId 
      : null;

    const existingParam = await prisma.labTestParameter.findUnique({
      where: { id }
    });

    if (!existingParam) return { error: "Parameter not found" };

    if (existingParam.isGlobal || existingParam.code !== codeUpper) {
      const duplicateCode = await prisma.labTestParameter.findFirst({
        where: { 
          labId: labId, 
          code: codeUpper,
          isActive: true,
          NOT: { 
             OR: [
               { id: id },
               { id: existingParam.forkedFromId || "none" } 
             ] 
          }
        }
      });

      if (duplicateCode) {
        return { error: `A parameter with the short code '${codeUpper}' already exists. Please use a different code.` };
      }
    }
    
    await prisma.$transaction(async (tx) => {
      
      // --- SCENARIO A: FORK ---
      if (existingParam.isGlobal) {
        const clonedParam = await tx.labTestParameter.create({
          data: {
            labId: labId,
            isGlobal: false,
            forkedFromId: existingParam.id, 
            name: data.name,
            code: codeUpper,
            printName: data.printName || data.name,
            price: data.price || 0,        // ✅ Saving to database
            decimals: data.decimals || 2,  // ✅ Saving to database
            unit: data.unit || null,
            method: data.method || null,
            formula: data.formula || null,
            containerTypeId: validContainerId,
            isActive: true
          }
        });

        if (data.ranges && data.ranges.length > 0) {
          await tx.parameterReferenceRange.createMany({
            data: data.ranges.map(range => ({
              parameterId: clonedParam.id,
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

        if (data.reagents && data.reagents.length > 0) {
          await tx.testParameterReagent.createMany({
            data: data.reagents.map(reagent => ({
              parameterId: clonedParam.id,
              inventoryItemId: reagent.inventoryItemId,
              quantity: reagent.quantity
            }))
          });
        }
      } 
      
      // --- SCENARIO B: DEEP UPDATE ---
      else {
        if (existingParam.labId !== labId) throw new Error("Unauthorized to edit this parameter");

        await tx.labTestParameter.update({
          where: { id: id }, 
          data: {
            name: data.name,
            code: codeUpper,
            printName: data.printName || data.name,
            price: data.price || 0,        // ✅ Added to update block!
            decimals: data.decimals || 2,  // ✅ Added to update block!
            unit: data.unit || null,
            method: data.method || null,
            formula: data.formula || null,
            containerTypeId: validContainerId,
          }
        });
    
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
      }
    });
  
    revalidatePath('/workspace/test-management');
    return { success: true };
  }

// --- 4. DELETE PARAMETER ---
export async function deleteParameter(id: string) {
  const labId = await getLabId();

  const existingParam = await prisma.labTestParameter.findUnique({ where: { id } });
  
  if (!existingParam) return { error: "Parameter not found." };
  if (existingParam.isGlobal) return { error: "Cannot delete a Global Master Parameter." };
  if (existingParam.labId !== labId) return { error: "Unauthorized." };

  await prisma.labTestParameter.update({
    where: { id },
    data: { isActive: false }
  });
  
  revalidatePath('/workspace/test-management');
  return { success: true };
}