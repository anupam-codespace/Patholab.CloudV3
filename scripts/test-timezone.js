// Test the timezone helpers using ts-node or compiled approach
process.env.TZ = 'Asia/Kolkata';

// Inline the functions to test logic without TS compilation issues
const IST_TIMEZONE = 'Asia/Kolkata';

function parseISTInput(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  const str = String(input).trim();
  if (!str) return null;

  if (/Z$|[+-]\d{2}:\d{2}$/.test(str)) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  const [, y, mo, d, h, mi, s] = m;
  const utcMs = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s || 0)
  ) - 330 * 60 * 1000;

  return new Date(utcMs);
}

function toISTInputValue(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

console.log('=== TEST 1: parseISTInput ===');
console.log('Input: "2026-08-31T15:30" (should be 3:30 PM IST = 10:00 AM UTC)');
const parsed = parseISTInput('2026-08-31T15:30');
console.log('Parsed Date:', parsed && parsed.toISOString());
console.log('Expected:   2026-08-31T10:00:00.000Z');
console.log('PASS:', parsed && parsed.toISOString() === '2026-08-31T10:00:00.000Z');

console.log('\n=== TEST 2: toISTInputValue ===');
console.log('Input: 2026-08-31T10:00:00.000Z (10 AM UTC = 3:30 PM IST)');
const formatted = toISTInputValue(new Date('2026-08-31T10:00:00.000Z'));
console.log('Formatted:', formatted);
console.log('Expected:  2026-08-31T15:30');
console.log('PASS:', formatted === '2026-08-31T15:30');

console.log('\n=== TEST 3: Round trip ===');
const original = '2026-08-31T15:30';
const roundTrip = toISTInputValue(parseISTInput(original));
console.log('Original:  ', original);
console.log('Round trip:', roundTrip);
console.log('PASS:', original === roundTrip);

console.log('\n=== TEST 4: ISO with Z passes through ===');
const isoParsed = parseISTInput('2026-08-31T10:00:00.000Z');
console.log('Input: "2026-08-31T10:00:00.000Z"');
console.log('Parsed:', isoParsed && isoParsed.toISOString());
console.log('PASS:', isoParsed && isoParsed.toISOString() === '2026-08-31T10:00:00.000Z');
