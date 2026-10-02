import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createToken, verifyToken, removeSignup, unsubscribeHandler } from '../netlify/lib/unsubscribe.js';

const env = { FOLLOW_US_UNSUBSCRIBE_SECRET: 'test-secret-'.repeat(4), FOLLOW_US_SPREADSHEET_ID: 'test-sheet' };
const now = 1800000000000;
const headers = ['Name', 'Email', 'Phone', 'Signup timestamp (UTC)', 'Consent wording', 'Source'];
function sheet(rows, fail = false) {
  const cleared = [];
  return { cleared, spreadsheets: { values: {
    async get() { return { data: { values: rows } }; },
    async batchClear({ requestBody }) { if (fail) throw new Error('Google unavailable'); cleared.push(...requestBody.ranges); },
  } } };
}
const request = (body, method = 'POST') => ({ httpMethod: method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('confirmation tokens bind the email and expire, rejecting tampering', () => {
  const token = createToken(' Guest@Example.com ', env, now);
  assert.equal(verifyToken(token, env, now), 'guest@example.com');
  assert.equal(verifyToken(token, env, now + 86400000), null);
  assert.equal(verifyToken(token + 'x', env, now), null);
  assert.equal(verifyToken(createToken('other@example.com', env, now).split('.')[0] + '.' + token.split('.')[1], env, now), null);
});

test('removal clears all matching records, preserving headers and other subscribers without shifting rows', async () => {
  const s = sheet([headers, ['Guest', ' GUEST@example.com ', '0123'], ['Other', 'other@example.com'], ['Guest again', 'guest@example.com']]);
  await removeSignup(s, 'test-sheet', 'guest@example.com');
  assert.deepEqual(s.cleared, ["'Signups'!A2:I2", "'Signups'!A4:I4"]);
});

test('missing subscriber is idempotent and unexpected headers fail safely', async () => {
  const s = sheet([headers, ['Other', 'other@example.com']]);
  await removeSignup(s, 'test-sheet', 'guest@example.com');
  assert.deepEqual(s.cleared, []);
  await assert.rejects(removeSignup(sheet([['Email', 'Name']]), 'test-sheet', 'guest@example.com'));
});

test('request only sends a confirmation email; GET and forged tokens never remove a record', async () => {
  const sent = [];
  const s = sheet([headers, ['Guest', 'guest@example.com']]);
  const handler = unsubscribeHandler({ env, sheets: () => s, sendConfirmation: async (...args) => sent.push(args), now: () => now, log: { error() {} } });
  assert.equal((await handler(request({ email: 'guest@example.com' }))).statusCode, 200);
  assert.equal(sent.length, 1);
  assert.match(sent[0][1], /^https:\/\/homeorg.com.au\/follow-us\/\?unsubscribe=/);
  assert.deepEqual(s.cleared, []);
  assert.equal((await handler(request({}, 'GET'))).statusCode, 405);
  assert.equal((await handler(request({ token: 'forged' }))).statusCode, 400);
  assert.equal((await handler(request({ token: createToken('guest@example.com', env, now) }))).statusCode, 200);
  assert.deepEqual(s.cleared, ["'Signups'!A2:I2"]);
});

test('Google or mail failures never report a confirmed unsubscribe', async () => {
  const handler = unsubscribeHandler({ env, sheets: () => sheet([headers, ['Guest', 'guest@example.com']], true), sendConfirmation: async () => { throw new Error('Mail unavailable'); }, now: () => now, log: { error() {} } });
  for (const data of [{ email: 'guest@example.com' }, { token: createToken('guest@example.com', env, now) }]) {
    const result = await handler(request(data));
    assert.equal(result.statusCode, 503);
    assert.equal(JSON.parse(result.body).success, undefined);
  }
});

test('invalid input, oversized requests and honeypots do not send messages', async () => {
  let sent = 0;
  const handler = unsubscribeHandler({ env, sheets: () => sheet([headers]), sendConfirmation: async () => sent++, log: { error() {} } });
  for (const data of [{ email: {} }, { email: 'a@example.com\r\nBcc: other@example.com' }, [], null]) {
    assert.equal((await handler(request(data))).statusCode, 400);
  }
  assert.equal((await handler(request({ email: 'guest@example.com', website: 'spam' }))).statusCode, 200);
  assert.equal((await handler(request({ email: 'x'.repeat(5000) }))).statusCode, 413);
  assert.equal(sent, 0);
});

function client(fetch, token = '') {
  let submit;
  let resets = 0;
  const button = { disabled: true };
  const status = { dataset: {} };
  const emailLabel = { hidden: false };
  const elements = { email: { value: 'guest@example.com', required: true }, website: { value: '' } };
  const form = { elements, querySelector: () => button, reportValidity: () => true,
    addEventListener: (_, fn) => { submit = fn; }, setAttribute() {}, removeAttribute() {}, scrollIntoView() {}, reset() { resets++; } };
  const context = vm.createContext({ document: { getElementById: id => ({ 'unsubscribe-form': form, 'unsubscribe-status': status, 'unsubscribe-email': emailLabel })[id] },
    window: { location: { search: token ? `?unsubscribe=${token}` : '', pathname: '/follow-us/' }, history: { replaceState() {} } },
    fetch, URLSearchParams, AbortSignal });
  vm.runInContext(readFileSync(new URL('../public/js/unsubscribe.js', import.meta.url), 'utf8'), context);
  return { button, status, elements, emailLabel, resets: () => resets, submit: () => submit({ preventDefault() {} }) };
}

test('client does not confirm on page load and sends the token only on deliberate submission', async () => {
  const requests = [];
  const app = client(async (_, options) => { requests.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ success: true, unsubscribed: true }) }; }, 'signed-token');
  assert.equal(requests.length, 0);
  assert.equal(app.emailLabel.hidden, true);
  await app.submit();
  assert.deepEqual(requests, [{ token: 'signed-token' }]);
  assert.match(app.status.textContent, /details have been removed/);
  assert.equal(app.button.hidden, true);
});

test('client retains input on failure, permits retry and blocks simultaneous sends', async () => {
  let finish;
  let calls = 0;
  const app = client(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const first = app.submit();
  await app.submit();
  assert.equal(calls, 1);
  finish({ ok: false, json: async () => ({ error: 'Try again' }) });
  await first;
  assert.equal(app.resets(), 0);
  assert.equal(app.elements.email.value, 'guest@example.com');
  assert.equal(app.button.disabled, false);
  const second = app.submit();
  finish({ ok: true, json: async () => ({ success: true }) });
  await second;
  assert.equal(app.resets(), 1);
  assert.match(app.status.textContent, /Check your email/);
});
