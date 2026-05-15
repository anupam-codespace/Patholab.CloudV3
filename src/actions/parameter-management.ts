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

// --- 1. GET ALL PARAMETERS (WITH FORK HIDING LOGIC) ---
export async function getParameters() {
  const labId = await getLabId();
  return await prisma.labTestParameter.findMany({
    where: { 
      isActive: true, 
      OR: [
        // 1. Fetch local lab parameters
        { labId: labId },
        // 2. Fetch global master parameters... EXCEPT ones already forked by this lab!
        { 
          isGlobal: true,
          forks: { none: { labId: labId } }
        }
      ]
    },
    orderBy: { name: 'asc' },
    include: {
      referenceRanges: true,
      containerType: true,
      reagents: { include: { inventoryItem: true } } 
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
  reagents?: {
    inventoryItemId: string;
    quantity: number;
  }[];
}) {
  const labId = await getLabId();
  const codeUpper = data.code.toUpperCase();

  // ✅ SOFT ERROR CHECK: Prevent Unique Constraint Crash
  const existingCode = await prisma.labTestParameter.findFirst({
    where: { labId, code: codeUpper }
  });
  
  if (existingCode) {
    return { error: `A parameter with the short code '${codeUpper}' already exists in your lab.` };
  }

  await prisma.$transaction(async (tx) => {
    const parameter = await tx.labTestParameter.create({
      data: {
        labId,
        isGlobal: false, // Ensures new custom creations are explicitly local
        name: data.name,
        code: codeUpper,
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
    reagents?: {
      inventoryItemId: string;
      quantity: number;
    }[];
  }) {
    const labId = await getLabId(); 
    const codeUpper = data.code.toUpperCase();

    // Find the original to check if it's global
    const existingParam = await prisma.labTestParameter.findUnique({
      where: { id }
    });

    if (!existingParam) return { error: "Parameter not found" };

    // ✅ SOFT ERROR CHECK: Prevent Unique Constraint Crash on Update/Fork
    const duplicateCode = await prisma.labTestParameter.findFirst({
      where: { 
        labId: labId, 
        code: codeUpper,
        NOT: { id: id } // Exclude the current parameter we are editing
      }
    });

    if (duplicateCode) {
      return { error: `A parameter with the short code '${codeUpper}' already exists in your catalog. Please use a different code.` };
    }
  
    await prisma.$transaction(async (tx) => {
      
      // ==========================================
      // SCENARIO A: EDITING A GLOBAL PARAMETER -> FORK IT
      // ==========================================
      if (existingParam.isGlobal) {
        
        // 1. Create Local Copy
        const clonedParam = await tx.labTestParameter.create({
          data: {
            labId: labId,
            isGlobal: false,
            forkedFromId: existingParam.id, // 🔗 The Secret Link to hide the global one!
            name: data.name,
            code: codeUpper,
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

        // 2. Clone Ranges to the NEW ID
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

        // 3. Clone Reagents to the NEW ID
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
      
      // ==========================================
      // SCENARIO B: EDITING A LOCAL PARAMETER -> DEEP UPDATE
      // ==========================================
      else {
        if (existingParam.labId !== labId) throw new Error("Unauthorized to edit this parameter");

        // 1. Update Parent
        await tx.labTestParameter.update({
          where: { id: id }, 
          data: {
            name: data.name,
            code: codeUpper,
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

        // 3. Wipe & Replace Reagent Mappings
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

  // Security Check: Ensure they aren't trying to delete a global master parameter
  const existingParam = await prisma.labTestParameter.findUnique({ where: { id } });
  
  if (!existingParam) return { error: "Parameter not found." };
  if (existingParam.isGlobal) return { error: "Cannot delete a Global Master Parameter." };
  if (existingParam.labId !== labId) return { error: "Unauthorized." };

  await prisma.labTestParameter.delete({
    where: { id } 
  });
  
  revalidatePath('/workspace/test-management');
  return { success: true };
}