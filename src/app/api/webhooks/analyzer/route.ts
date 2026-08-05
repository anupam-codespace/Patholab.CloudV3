import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const labApiKey = req.headers.get('x-lab-api-key')?.trim();
    if (!labApiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 401 });

    const lab = await prisma.lab.findFirst({ where: { licenseNumber: labApiKey } });
    if (!lab) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { machineId, barcode, results } = await req.json();

    let analyzer = await prisma.labAnalyzer.findFirst({
      where: { labId: lab.id, name: machineId },
      include: { mappings: true }
    });

    if (!analyzer) {
      analyzer = await prisma.labAnalyzer.create({
        data: { labId: lab.id, name: machineId, model: "Auto-Registered", serialNumber: `SN-${Date.now()}` },
        include: { mappings: true }
      });
    }

    const sample = await prisma.sample.findFirst({
      where: { sampleId: barcode, labId: lab.id },
      include: { tests: { include: { results: true } } }
    });

    if (!sample) return NextResponse.json({ error: 'Barcode not found' }, { status: 404 });

    let updatedCount = 0;
    const unmappedCodes: string[] = []; // Track what failed!

    for (const res of results) {
      const machineCode = res.parameterCode.toUpperCase().trim();
      const dictionaryEntry = analyzer.mappings.find(m => m.machineCode.toUpperCase() === machineCode);
      
      let matched = false;

      for (const test of sample.tests) {
        const resultRow = test.results.find(r => {
          const dbName = r.parameterName.toUpperCase().trim();
          return (
            (dictionaryEntry && dbName === dictionaryEntry.parameterName.toUpperCase().trim()) ||
            dbName === machineCode ||
            (!dictionaryEntry && machineCode === 'HGB' && dbName.includes('HEMOGLOBIN')) ||
            (!dictionaryEntry && machineCode === 'WBC' && dbName.includes('WHITE')) ||
            (!dictionaryEntry && machineCode === 'PLT' && dbName.includes('PLATELET'))
          );
        });

        if (resultRow) {
          await prisma.testResultParameter.update({
            where: { id: resultRow.id },
            data: {
              value: res.value,
              isAbnormal: res.flag === 'H' || res.flag === 'L',
              entryMethod: 'MACHINE_INTERFACE',
              analyzerId: analyzer.id
            }
          });
          updatedCount++;
          matched = true;
          break; // Stop checking tests once matched
        }
      }

      if (!matched) unmappedCodes.push(machineCode);
    }

    // SAVE UNMAPPED CODES TO THE DATABASE QUEUE FOR THE UI
    if (unmappedCodes.length > 0) {
      for (const code of unmappedCodes) {
        await prisma.unmappedMachineCode.upsert({
          where: {
            labAnalyzerId_sampleId_machineCode: {
              labAnalyzerId: analyzer.id,
              sampleId: barcode,
              machineCode: code
            }
          },
          update: {}, // Just touch it
          create: {
            labId: lab.id,
            labAnalyzerId: analyzer.id,
            sampleId: barcode,
            machineCode: code
          }
        });
      }
      return NextResponse.json({ error: 'Mapping failure. Codes sent to Visual Mapper queue.' }, { status: 400 });
    }

    // IF EVERYTHING MATCHED, update test status and clear the queue!
    for (const test of sample.tests) {
      await prisma.test.update({ where: { id: test.id }, data: { status: 'IN_PROGRESS' } });
    }

    return NextResponse.json({ success: true, message: `Updated ${updatedCount} parameters.` });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}