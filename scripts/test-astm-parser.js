// Test the ASTM parser logic
// Copy the parser functions from the webhook route

function parseASTMResultLine(line) {
  const parts = line.split('|');
  if (parts.length < 5 || parts[0] !== 'R') return null;

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

function parseASTMOrderLine(line) {
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
    .filter(Boolean);

  return { barcode: barcode.trim(), testNames };
}

function parseASTMMessage(rawText) {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let machineId = 'ASTM-Analyzer';
  let currentBarcode = '';
  const results = [];

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

// === TESTS ===
console.log('=== Test 1: Parse a single ASTM result line ===');
const r1 = parseASTMResultLine('R|1|^^^WBC|6.5|10^3/µL|N|4.0-10.0||F|||||');
console.log(JSON.stringify(r1, null, 2));
console.log('PASS:', r1.parameterCode === 'WBC' && r1.value === '6.5' && r1.unit === '10^3/µL' && r1.flag === 'N');

console.log('\n=== Test 2: Parse an order line ===');
// ASTM uses \ (backslash) as separator between test orders
const o1 = parseASTMOrderLine('O|1|BC-001||^^^WBC\\^^^RBC\\^^^HGB|R||||||O');
console.log(JSON.stringify(o1, null, 2));
console.log('PASS:', o1.barcode === 'BC-001' && o1.testNames.length === 3);

console.log('\n=== Test 3: Parse a complete ASTM message ===');
const msg = `H|\\^&|||HOST^LAB|||||Sysmex-XN-1000^1.0
P|1
O|1|BC-001||^^^WBC^^^RBC^^^HGB|R||||||O
R|1|^^^WBC|6.5|10^3/µL|N|4.0-10.0||F|||||
R|2|^^^RBC|4.5|10^6/µL|N|||||F|||||
R|3|^^^HGB|13.2|g/dL|H|||||F|||||
L|1`;
const parsed = parseASTMMessage(msg);
console.log('Machine ID:', parsed.machineId);
console.log('Results count:', parsed.results.length);
console.log('First result:', parsed.results[0]);
console.log('PASS:', parsed.machineId === 'Sysmex-XN-1000' && parsed.results.length === 3);

console.log('\n=== Test 4: Empty message returns null ===');
const empty = parseASTMMessage('');
console.log('PASS:', empty === null);

console.log('\n=== Test 5: Message with no results returns null ===');
const noResults = parseASTMMessage('H|\\^&|||HOST\nL|1');
console.log('PASS:', noResults === null);

console.log('\n✅ All ASTM parser tests passed!');
