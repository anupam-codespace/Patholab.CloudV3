import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// ============================================================================
// ANALYZER WEBHOOK
// Supports JSON payload (from middleware) and ASTM/HL7 raw text formats.
//
// JSON Format (Content-Type: application/json):
//   Headers: x-lab-api-key: <lab.licenseNumber>
//   Body: {
//     machineId: "Sysmex-XN-1000",
//     results: [
//       { barcode: "BC-001", parameterCode: "WBC", value: "6.5", unit: "10^3/µL", flag: "N", referenceRange: "4.0-10.0" },
//       { barcode: "BC-001", parameterCode: "RBC", value: "4.5", unit: "10^6/µL", flag: "N" },
//       { barcode: "BC-002", parameterCode: "HGB", value: "13.2", unit: "g/dL", flag: "H" }
//     ]
//   }
//
// ASTM E1394 Format (Content-Type: text/plain):
//   Headers: x-lab-api-key: <lab.licenseNumber>
//   Body: H|\^&|||HOST^LAB|||||Sysmex-XN-1000^1.0
//         P|1
//         O|1|BC-001||^^^WBC^^^RBC^^^HGB|R||||||O
//         R|1|^^^WBC|6.5|10^3/µL|N|4.0-10.0||F|||||
//         R|2|^^^RBC|4.5|10^6/µL|N|||||F|||||
//         L|1
// ============================================================================

// ASTM result line parser: R|1|^^^WBC|6.5|10^3/µL|N|4.0-10.0||F|||||
function parseASTMResultLine(line: string): any | null {
  const parts = line.split('|');
  if (parts.length < 5 || parts[0] !== 'R') return null;

  // parts[2] is the parameter code, format: ^^^WBC or ^^WBC^^subfield
  const codeField = parts[2] || '';
  const codeParts = codeField.split('^');
  const parameterCode = codeParts[codeParts.length - 1] || codeParts[3] || '';

  if (!parameterCode) return null;

  return {
    parameterCode: parameterCode.trim(),
    value: (parts[3] || '').trim(),
    unit: (parts[4] || '').trim(),
    flag: (parts[5] || '').trim(),
    referenceRange: (parts[6] || '').trim(),
  };
}

// ASTM order line parser: O|1|BC-001||^^^WBC\^^^RBC\^^^HGB|...|  -> extract sample ID + test names
function parseASTMOrderLine(line: string): { barcode: string; testNames: string[] } | null {
  const parts = line.split('|');
  if (parts.length < 4 || parts[0] !== 'O') return null;

  // ASTM E1394: O|<seq>|<sample-id>|<specimen-id>|<test-orders>|...
  // Some analyzers put sample-id at parts[2], others at parts[3].
  // Use whichever is non-empty.
  const sampleId = parts[2] || '';
  const specimenId = parts[3] || '';
  const barcode = (sampleId && sampleId.trim()) || (specimenId && specimenId.split('^')[0]) || '';

  // parts[4] holds ordered tests in format ^^^WBC\^^^RBC\^^^HGB
  const testsField = parts[4] || '';
  const testNames = testsField.split('\\')
    .map(t => t.split('^').filter(Boolean).pop())
    .filter(Boolean) as string[];

  return { barcode: barcode.trim(), testNames };
}

// ASTM message parser — returns { machineId, results: [{barcode, parameterCode, value, unit, flag, referenceRange}] }
function parseASTMMessage(rawText: string): { machineId: string; results: any[] } | null {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let machineId = 'ASTM-Analyzer';
  let currentBarcode = '';
  const results: any[] = [];

  for (const line of lines) {
    const recordType = line[0];
    const parts = line.split('|');

    if (recordType === 'H') {
      // Header: H|\^&|||HOST^LAB|||||Sysmex-XN-1000^1.0
      // parts[4] is the sender (often "HOST"), parts[9] is the analyzer model
      const senderField = parts[4] || '';
      const analyzerField = parts[9] || '';
      const analyzerParts = analyzerField.split('^');
      if (analyzerParts[0] && analyzerParts[0] !== 'HOST') {
        machineId = analyzerParts[0];
      } else if (senderField) {
        const senderParts = senderField.split('^');
        if (senderParts[0] && !senderParts[0].includes('HOST')) {
          machineId = senderParts[0];
        }
      }
    } else if (recordType === 'O') {
      const order = parseASTMOrderLine(line);
      if (order) currentBarcode = order.barcode;
    } else if (recordType === 'R') {
      const result = parseASTMResultLine(line);
      if (result && currentBarcode) {
        results.push({ barcode: currentBarcode, ...result });
      }
    }
  }

  if (results.length === 0) return null;
  return { machineId, results };
}

// ============================================================================
// MAIN POST HANDLER
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate via lab API key (license number)
    const labApiKey = req.headers.get('x-lab-api-key')?.trim();
    if (!labApiKey) {
      return NextResponse.json({ error: 'Missing x-lab-api-key header' }, { status: 401 });
    }

    const lab = await prisma.lab.findFirst({ where: { licenseNumber: labApiKey } });
    if (!lab) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // 2. Parse the request — support both JSON and ASTM/HL7 text
    let machineId: string;
    let results: any[];
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('text/plain') || contentType.includes('application/octet-stream')) {
      // Raw ASTM/HL7 text
      const rawText = await req.text();
      const parsed = parseASTMMessage(rawText);
      if (!parsed) {
        return NextResponse.json({ error: 'Failed to parse ASTM/HL7 message' }, { status: 400 });
      }
      machineId = parsed.machineId;
      results = parsed.results;
    } else {
      // JSON payload (default)
      const body = await req.json();
      machineId = body.machineId || body.machine_id || 'Unknown-Analyzer';

      // Support both single-sample and multi-sample formats
      if (Array.isArray(body.results)) {
        // Multi-sample format: results = [{barcode, parameterCode, value, ...}, ...]
        results = body.results;
      } else if (body.barcode && body.parameters) {
        // Single-sample format: { barcode, parameters: [{code, value, ...}] }
        results = body.parameters.map((p: any) => ({
          barcode: body.barcode,
          parameterCode: p.code || p.parameterCode,
          value: p.value,
          unit: p.unit,
          flag: p.flag,
          referenceRange: p.referenceRange,
        }));
      } else {
        return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 });
      }
    }

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'No results provided' }, { status: 400 });
    }

    // 3. Find or auto-register the analyzer
    let analyzer = await prisma.labAnalyzer.findFirst({
      where: { labId: lab.id, name: machineId },
      include: { mappings: true },
    });

    if (!analyzer) {
      analyzer = await prisma.labAnalyzer.create({
        data: {
          labId: lab.id,
          name: machineId,
          model: 'Auto-Registered',
          serialNumber: `SN-${Date.now()}`,
          protocol: contentType.includes('text') ? 'ASTM' : 'JSON',
        },
        include: { mappings: true },
      });
    }

    // 4. Process each result — group by barcode
    const resultsByBarcode = new Map<string, any[]>();
    for (const r of results) {
      const bc = r.barcode;
      if (!bc) continue;
      if (!resultsByBarcode.has(bc)) resultsByBarcode.set(bc, []);
      resultsByBarcode.get(bc)!.push(r);
    }

    let totalUpdated = 0;
    const unmappedCodes: string[] = [];
    const sampleErrors: string[] = [];
    const processedSamples: string[] = [];

    for (const [barcode, sampleResults] of Array.from(resultsByBarcode.entries())) {
      // Find the sample
      const sample = await prisma.sample.findFirst({
        where: {
          OR: [
            { sampleId: barcode, labId: lab.id },
            { sampleId: { contains: barcode }, labId: lab.id },
          ],
        },
        include: { tests: { include: { results: true } } },
      });

      if (!sample) {
        sampleErrors.push(`Barcode ${barcode} not found`);
        continue;
      }

      processedSamples.push(barcode);

      for (const res of sampleResults) {
        const machineCode = (res.parameterCode || '').toUpperCase().trim();
        if (!machineCode) continue;

        // Look up mapping in dictionary
        const dictionaryEntry = analyzer.mappings.find(
          m => m.machineCode.toUpperCase().trim() === machineCode
        );

        let matched = false;

        for (const test of sample.tests) {
          const resultRow = test.results.find(r => {
            const dbName = (r.parameterName || '').toUpperCase().trim();
            const dbCode = (r.parameterCode || '').toUpperCase().trim();
            return (
              (dictionaryEntry && dbName === dictionaryEntry.parameterName.toUpperCase().trim()) ||
              dbCode === machineCode ||
              dbName === machineCode ||
              // Fuzzy fallbacks for common abbreviations
              (!dictionaryEntry && machineCode === 'HGB' && dbName.includes('HEMOGLOBIN')) ||
              (!dictionaryEntry && machineCode === 'WBC' && (dbName.includes('WHITE') || dbName.includes('LEUKOCYTE'))) ||
              (!dictionaryEntry && machineCode === 'PLT' && (dbName.includes('PLATELET') || dbName.includes('THROMBOCYTE'))) ||
              (!dictionaryEntry && machineCode === 'RBC' && (dbName.includes('RED') || dbName.includes('ERYTHROCYTE')))
            );
          });

          if (resultRow) {
            // Parse value as numeric if possible
            const rawValue = String(res.value ?? '').trim();
            const numVal = parseFloat(rawValue);
            const isNumeric = !isNaN(numVal) && rawValue !== '';

            await prisma.testResultParameter.update({
              where: { id: resultRow.id },
              data: {
                numericValue: isNumeric ? numVal : null,
                textValue: rawValue,
                flag: res.flag || null,
                entryMethod: 'MACHINE_INTERFACE',
                analyzerId: analyzer.id,
                ...(res.referenceRange ? { referenceRangeText: res.referenceRange } : {}),
              },
            });
            totalUpdated++;
            matched = true;
            break; // Stop checking tests once matched
          }
        }

        if (!matched) unmappedCodes.push(machineCode);
      }

      // Mark tests as IN_PROGRESS
      for (const test of sample.tests) {
        if (test.status === 'PENDING') {
          await prisma.test.update({
            where: { id: test.id },
            data: { status: 'IN_PROGRESS' },
          }).catch(() => {/* ignore */});
        }
      }
    }

    // 5. Save unmapped codes to the Visual Mapper queue
    if (unmappedCodes.length > 0) {
      const uniqueUnmapped = Array.from(new Set(unmappedCodes));
      for (const code of uniqueUnmapped) {
        await prisma.unmappedMachineCode.upsert({
          where: {
            labAnalyzerId_sampleId_machineCode: {
              labAnalyzerId: analyzer.id,
              sampleId: processedSamples[0] || 'UNKNOWN',
              machineCode: code,
            },
          },
          update: {},
          create: {
            labId: lab.id,
            labAnalyzerId: analyzer.id,
            sampleId: processedSamples[0] || 'UNKNOWN',
            machineCode: code,
          },
        }).catch(() => {/* ignore unique constraint errors */});
      }
    }

    // 6. Return comprehensive response
    return NextResponse.json({
      success: true,
      machineId,
      totalResults: results.length,
      updated: totalUpdated,
      unmappedCount: unmappedCodes.length,
      unmappedCodes: Array.from(new Set(unmappedCodes)),
      processedSamples,
      sampleErrors,
    });

  } catch (error: any) {
    console.error('[ANALYZER_WEBHOOK_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET: Health check endpoint for analyzer middleware
// ============================================================================
export async function GET(req: NextRequest) {
  const labApiKey = req.headers.get('x-lab-api-key')?.trim();
  if (!labApiKey) {
    return NextResponse.json({ status: 'error', message: 'Missing API key' }, { status: 401 });
  }
  const lab = await prisma.lab.findFirst({ where: { licenseNumber: labApiKey } });
  if (!lab) {
    return NextResponse.json({ status: 'error', message: 'Invalid API key' }, { status: 401 });
  }
  return NextResponse.json({
    status: 'ok',
    labId: lab.id,
    labName: lab.name,
    timestamp: new Date().toISOString(),
    supportedProtocols: ['JSON', 'ASTM', 'HL7'],
  });
}
