import { PrismaClient, Gender, TestType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Seeding Clinical Master...");

  // ================================
  // 1. DEPARTMENTS
  // ================================
  const deptList = [
    { name: 'Hematology', code: 'HEM' },
    { name: 'Biochemistry', code: 'BIO' },
    { name: 'Immunology', code: 'IMM' },
    { name: 'Clinical Pathology', code: 'CP' },
    { name: 'Hormones', code: 'HOR' },
    { name: 'Microbiology', code: 'MIC' },
    { name: 'Coagulation', code: 'COAG' }
  ];

  const depts: any = {};

  for (const d of deptList) {
    let record = await prisma.department.findFirst({
      where: { name: d.name, isGlobal: true }
    });

    if (!record) {
      record = await prisma.department.create({
        data: { ...d, isGlobal: true }
      });
    }

    depts[d.code] = record;
  }

  // ================================
  // 2. SAMPLE TYPES
  // ================================
  const samples: any = {};
  const sampleList = [
    { name: 'Whole Blood (EDTA)', code: 'WB' },
    { name: 'Serum', code: 'SERUM' },
    { name: 'Fluoride Plasma', code: 'FLU' },
    { name: 'Urine', code: 'URINE' }
  ];

  for (const s of sampleList) {
    let record = await prisma.sampleType.findFirst({
      where: { name: s.name, isGlobal: true }
    });

    if (!record) {
      record = await prisma.sampleType.create({
        data: { ...s, isGlobal: true }
      });
    }

    samples[s.code] = record;
  }

  // ================================
  // 3. CONTAINERS
  // ================================
  const containers: any = {};
  const containerList = [
    { name: 'EDTA Tube', code: 'EDTA' },
    { name: 'Plain Tube', code: 'PLAIN' },
    { name: 'Fluoride Tube', code: 'FLU' },
    { name: 'Urine Container', code: 'URINE' }
  ];

  for (const c of containerList) {
    let record = await prisma.containerType.findFirst({
      where: { name: c.name, isGlobal: true }
    });

    if (!record) {
      record = await prisma.containerType.create({
        data: { ...c, isGlobal: true }
      });
    }

    containers[c.code] = record;
  }

  // ================================
  // 4. PARAMETERS
  // ================================
  const createdParams: any = {};

  const params = [
    { name: 'Hemoglobin', code: 'HB', unit: 'g/dL', ranges: [{ gender: Gender.MALE, low: 13, high: 17 }, { gender: Gender.FEMALE, low: 12, high: 15 }] },
    { name: 'WBC Count', code: 'WBC', unit: '/cumm', ranges: [{ gender: Gender.BOTH, low: 4000, high: 11000 }] },
    { name: 'Platelets', code: 'PLT', unit: '/cumm', ranges: [{ gender: Gender.BOTH, low: 150000, high: 450000 }] },
  ];

  for (const p of params) {
    let record = await prisma.labTestParameter.findFirst({
      where: { code: p.code, isGlobal: true }
    });

    if (!record) {
      record = await prisma.labTestParameter.create({
        data: {
          name: p.name,
          code: p.code,
          unit: p.unit,
          isGlobal: true,
          referenceRanges: {
            create: p.ranges.map(r => ({
              gender: r.gender,
              lowValue: r.low,
              highValue: r.high
            }))
          }
        }
      });
    }

    createdParams[p.code] = record;
  }

  // ================================
  // 5. TEST TEMPLATES
  // ================================
  const tests = [
    {
      name: 'CBC',
      code: 'CBC',
      dept: 'HEM',
      sample: 'WB',
      container: 'EDTA',
      params: ['HB', 'WBC', 'PLT']
    }
  ];

  for (const t of tests) {
    let template = await prisma.testTemplate.findFirst({
      where: { code: t.code, isGlobal: true }
    });

    if (!template) {
      template = await prisma.testTemplate.create({
        data: {
          name: t.name,
          code: t.code,
          isGlobal: true,
          type: t.params.length > 1 ? TestType.BUNDLE : TestType.SINGLE,
          departmentId: depts[t.dept].id,
          sampleTypeId: samples[t.sample].id,
          containerTypeId: containers[t.container].id,
          price: 300
        }
      });

      for (let i = 0; i < t.params.length; i++) {
        await prisma.testTemplateParameter.create({
          data: {
            templateId: template.id,
            parameterId: createdParams[t.params[i]].id,
            order: i
          }
        });
      }
    }
  }

  console.log("✅ DONE: Seeded successfully");
}

main().finally(() => prisma.$disconnect());