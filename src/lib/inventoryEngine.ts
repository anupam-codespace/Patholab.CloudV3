import prisma from "@/lib/prisma";

/**
 * Automatically deducts inventory stock based on the parameters of a completed test.
 * Uses FIFO (First Expiring, First Out) logic.
 * * @param testId The ID of the test that was just completed/approved
 * @param performedBy The user ID of the technician (optional, for audit logs)
 */
export async function consumeReagentsForTest(testId: string, performedBy?: string) {
  try {
    // 1. Fetch the test and its results to know WHICH parameters were tested
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { results: true }
    });

    if (!test || !test.results || test.results.length === 0) {
      console.log(`[Inventory Engine] No results found for test ${testId}. Skipping deduction.`);
      return { success: true, message: "No parameters to process." };
    }

    // Extract the names of the parameters that were actually tested
    const testedParameterNames = test.results.map(r => r.parameterName);

    // 2. Find the Master Parameter IDs based on the names 
    // (Assuming LabTestParameter maps to TestResultParameter via name)
    const masterParameters = await prisma.labTestParameter.findMany({
      where: { 
        labId: test.labId,
        name: { in: testedParameterNames }
      },
      include: {
        reagents: true // Bring the recipes!
      }
    });

    // 3. Process each mapped reagent
    for (const param of masterParameters) {
      if (!param.reagents || param.reagents.length === 0) continue;

      for (const recipe of param.reagents) {
        let quantityNeeded = recipe.quantity;
        const itemId = recipe.inventoryItemId;

        // 4. FIFO Logic: Fetch batches for this item that have stock, sorted by Expiry Date
        const availableBatches = await prisma.inventoryBatch.findMany({
          where: {
            itemId: itemId,
            currentQuantity: { gt: 0 }
          },
          orderBy: { expiryDate: 'asc' } // Expiring soonest gets used first
        });

        // 5. Deduct from batches until requirement is met
        for (const batch of availableBatches) {
          if (quantityNeeded <= 0) break; // Finished fulfilling this recipe

          // Determine how much we can take from THIS batch
          const deductAmount = Math.min(batch.currentQuantity, quantityNeeded);
          
          // Execute the deduction in a transaction to ensure data integrity
          await prisma.$transaction(async (tx) => {
            // Update Batch Stock
            await tx.inventoryBatch.update({
              where: { id: batch.id },
              data: { currentQuantity: batch.currentQuantity - deductAmount }
            });

            // Create Transaction Log
            await tx.inventoryTransaction.create({
              data: {
                batchId: batch.id,
                quantity: -deductAmount, // Negative represents consumption
                type: "CONSUMPTION",
                testId: test.id,
                notes: `Auto-deducted for parameter: ${param.name}`,
                performedBy: performedBy || "SYSTEM"
              }
            });
          });

          // Reduce the remaining amount needed
          quantityNeeded -= deductAmount;
        }

        // 6. Alert if we ran out of stock before fulfilling the recipe
        if (quantityNeeded > 0) {
          console.warn(`[Inventory Engine] WARNING: Insufficient stock for Item ID ${itemId}. Missing ${quantityNeeded} units for Test ${testId}.`);
          // In a real system, you might trigger a 'Notification' here for the Lab Manager
        }
      }
    }

    return { success: true, message: "Inventory successfully deducted." };

  } catch (error) {
    console.error("[Inventory Engine] Failed to consume reagents:", error);
    return { success: false, error: "Internal engine error." };
  }
}