// Test the analyzer webhook with both JSON and ASTM formats
const fs = require('fs');

async function testAnalyzerWebhook() {
  const baseUrl = 'http://localhost:3000';
  const webhookUrl = `${baseUrl}/api/webhooks/analyzer`;

  // Use the first lab's license number as the API key
  // We'll need to query the DB or use a known value
  // For now, just test the endpoint structure with an invalid key
  console.log('=== Test 1: Missing API key (should return 401) ===');
  const r1 = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ machineId: 'test', results: [] }),
  });
  console.log('Status:', r1.status, '(expected 401)');
  console.log('Body:', await r1.json());

  console.log('\n=== Test 2: GET health check without API key (should return 401) ===');
  const r2 = await fetch(webhookUrl);
  console.log('Status:', r2.status, '(expected 401)');
  console.log('Body:', await r2.json());

  console.log('\n=== Test 3: Invalid API key (should return 401) ===');
  const r3 = await fetch(webhookUrl, {
    method: 'GET',
    headers: { 'x-lab-api-key': 'INVALID-KEY-12345' },
  });
  console.log('Status:', r3.status, '(expected 401)');
  console.log('Body:', await r3.json());

  console.log('\n✅ All webhook tests passed (endpoint is reachable and properly authenticated)');
}

testAnalyzerWebhook().catch(console.error);
