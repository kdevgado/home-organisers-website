import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { DateTime } from 'luxon';
const zone = 'Australia/Melbourne';
const day = DateTime.now().setZone(zone).plus({ days: 2 }).toISODate();
function calendar(result) {
  let calls = 0;
  const context = vm.createContext({ DateTime, console: { error() {} }, process: { env: { GOOGLE_SERVICE_ACCOUNT_KEY: '{}', GOOGLE_CALENDAR_ID: 'test' } }, google: {
    auth: { GoogleAuth: class {} }, calendar: () => ({ freebusy: { query: async () => { calls++; return { data: { calendars: { test: result } } }; } } }),
  } });
  vm.runInContext(readFileSync('netlify/functions/available-slots.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export async function', 'async function').replace('export const config', 'const config'), context);
  return { calls: () => calls, request: date => context.handler({ httpMethod: 'GET', queryStringParameters: { date } }) };
}
test('partial and offset-equivalent busy periods block the entire overlapping slot', async () => {
  const at = time => DateTime.fromISO(`${day}T${time}`, { zone }).toUTC().toISO();
  const response = await calendar({ busy: [{ start: at('09:15'), end: at('09:45') }] }).request(day);
  const slots = JSON.parse(response.body).slots;
  assert.equal(slots.length, 14);
  assert.equal(DateTime.fromISO(slots[0]).setZone(zone).toFormat('HH:mm'), '10:00');
});
test('calendar errors and missing or malformed free/busy results fail closed', async () => {
  for (const result of [undefined, { errors: [{ reason: 'notFound' }] }, {}, { busy: [{ start: 'bad', end: 'bad' }] }]) {
    assert.equal((await calendar(result).request(day)).statusCode, 502);
  }
});
test('invalid, past and distant dates never call Google', async () => {
  const api = calendar({ busy: [] });
  for (const date of ['2030-02-30', '2020-01-01', '2100-01-01', 'bad']) assert.equal((await api.request(date)).statusCode, 400);
  assert.equal(api.calls(), 0);
});
