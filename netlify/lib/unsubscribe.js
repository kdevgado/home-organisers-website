import { createHmac, timingSafeEqual } from 'node:crypto';

export const normaliseEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
export const validEmail = value => typeof value === 'string' && value.length <= 254 && !/[\r\n\0]/.test(value) && /^[^\s@<>,;:()[\]\\"]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value);

function secret(env) {
  if (!env.FOLLOW_US_UNSUBSCRIBE_SECRET || env.FOLLOW_US_UNSUBSCRIBE_SECRET.length < 32) throw new Error('Unsubscribe signing secret is not configured');
  return env.FOLLOW_US_UNSUBSCRIBE_SECRET;
}

export function createToken(email, env, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ email: normaliseEmail(email), expires: now + 86400000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret(env)).update(payload).digest('base64url')}`;
}

export function verifyToken(token, env, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const expected = createHmac('sha256', secret(env)).update(parts[0]).digest('base64url');
  if (parts[1].length !== expected.length || !timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    return validEmail(data.email) && Number.isFinite(data.expires) && data.expires > now ? normaliseEmail(data.email) : null;
  } catch { return null; }
}

// Clear complete records without shifting rows. Two simultaneous opt-outs cannot
// move another subscriber into a row selected by the first request.
export async function removeSignup(sheets, spreadsheetId, email) {
  if (!spreadsheetId) throw new Error('Signup spreadsheet is not configured');
  const { data } = await sheets.spreadsheets.values.get({ spreadsheetId, range: "'Signups'!A:I" });
  const rows = data.values || [];
  const headers = ['Name', 'Email', 'Phone', 'Signup timestamp (UTC)', 'Consent wording', 'Source'];
  if (!headers.every((header, i) => rows[0]?.[i] === header)) throw new Error('Unexpected signup headers');
  const target = normaliseEmail(email);
  const ranges = rows.flatMap((row, i) => i > 0 && normaliseEmail(row[1]) === target ? [`'Signups'!A${i + 1}:I${i + 1}`] : []);
  if (ranges.length) await sheets.spreadsheets.values.batchClear({ spreadsheetId, requestBody: { ranges } });
}

export function unsubscribeHandler({ env, sheets, sendConfirmation, now = Date.now, log = console }) {
  const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(statusCode === 405 ? { Allow: 'POST' } : {}) }, body: JSON.stringify(body) });
  return async event => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'];
    if (!/^application\/json(?:\s*;|$)/i.test(contentType || '')) return json(415, { error: 'Please send JSON' });
    const body = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString() : event.body || '';
    if (Buffer.byteLength(body) > 4096) return json(413, { error: 'Request is too large' });
    let data;
    try { data = JSON.parse(body); } catch { return json(400, { error: 'Invalid request' }); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json(400, { error: 'Invalid request' });
    try {
      if (data.token !== undefined) {
        const email = verifyToken(data.token, env, now());
        if (!email) return json(400, { error: 'This link is invalid or expired. Request a new link.' });
        await removeSignup(sheets(), env.FOLLOW_US_SPREADSHEET_ID, email);
        return json(200, { success: true, unsubscribed: true });
      }
      if (!validEmail(data.email)) return json(400, { error: 'Please enter a valid email address.' });
      if (data.website) return json(200, { success: true });
      if (!env.FOLLOW_US_SPREADSHEET_ID) throw new Error('Signup spreadsheet is not configured');
      const token = createToken(data.email, env, now());
      await sendConfirmation(normaliseEmail(data.email), `https://homeorg.com.au/follow-us/?unsubscribe=${encodeURIComponent(token)}`);
      // No subscriber lookup is exposed through this endpoint.
      return json(200, { success: true });
    } catch {
      log.error('Follow Us unsubscribe failed');
      return json(503, { error: 'We could not complete your request. Please try again or email roweedelgado@homeorg.com.au.' });
    }
  };
}
