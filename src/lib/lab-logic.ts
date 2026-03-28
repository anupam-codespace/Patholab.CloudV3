import { TestTemplate, ContainerType, LabTestParameter } from '@prisma/client';

// Define a type that includes the relations we need
export type TestTemplateWithRelations = TestTemplate & {
  containerType: ContainerType | null;
  parameters: (any & { parameter: LabTestParameter })[]; // Adjust based on your exact Prisma return type
};

export interface SampleGroup {
  containerId: string | 'generic';
  containerName: string;      // e.g. "Lavender Top"
  containerCode: string;      // e.g. "EDTA"
  tests: TestTemplateWithRelations[];
}

/**
 * Groups a list of selected Test Templates into Samples (Tubes).
 * Logic: All tests sharing the same 'containerTypeId' go into one bucket.
 */
export function groupTestsByContainer(selectedTests: TestTemplateWithRelations[]): SampleGroup[] {
  const groups: Record<string, SampleGroup> = {};

  selectedTests.forEach((test) => {
    // 1. Identify the Container
    // If a test has no container linked, we group it under "General Vial"
    const cId = test.containerTypeId || 'generic';
    const cName = test.containerType?.name || 'General Vial';
    const cCode = test.containerType?.code || 'GEN';

    // 2. Initialize Group if it doesn't exist yet
    if (!groups[cId]) {
      groups[cId] = {
        containerId: cId,
        containerName: cName,
        containerCode: cCode,
        tests: []
      };
    }

    // 3. Add Test to this Bucket
    groups[cId].tests.push(test);
  });

  return Object.values(groups);
}