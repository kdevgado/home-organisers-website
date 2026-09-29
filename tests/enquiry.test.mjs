import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseEnquiry } from '../netlify/lib/enquiry.js';
import { server } from './helpers/mail-server.mjs';

const enquiry = { name: 'Visitor', email: 'visitor@example.com', suburb: 'Shepparton', contact_method: 'Email', services: ['NDIS / Specialised Support'] };
const parse = data => parseEnquiry({ body: JSON.stringify(data) });

test('enquiries reject unsafe types, headers, long values and invalid dates before sending', async () => {
  const { request, sent } = server();
  for (const changes of [{ name: {} }, { email: 'a@b.com\r\nBcc: attacker@example.com' }, { name: 'x'.repeat(121) }, { message: 'x'.repeat(4001) }, { services: [{}] }, { services: {} }, { booking_date: '2030-02-30' }, { booking_date: '2000-01-01' }, { contact_method: 'Phone', phone: '' }, { contact_method: 'fax' }, { form_type: 'arbitrary' }]) {
    assert.equal((await request({ ...enquiry, ...changes })).statusCode, 400, JSON.stringify(changes));
  }
  assert.equal(sent.length, 0);
});

test('bounded JSON parser handles invalid bodies, media types and base64 payloads', () => {
  assert.equal(parseEnquiry({ body: '{' }).status, 400);
  assert.equal(parse(null).status, 400);
  assert.equal(parse([]).status, 400);
  assert.equal(parseEnquiry({ body: 'x'.repeat(16001) }).status, 413);
  assert.equal(parseEnquiry({ body: '{}', headers: { 'content-type': 'text/plain' } }).status, 415);
  assert.equal(parseEnquiry({ body: Buffer.from(JSON.stringify(enquiry)).toString('base64'), isBase64Encoded: true }).data.suburb, 'Shepparton');
});

test('email fields cannot be interpreted as multiple recipients or display names', () => {
  for (const email of ['one,two@example.com', 'Name <one@example.com>', 'a(b)@example.com', 'group:one@example.com;', 'a\\b@example.com']) assert.equal(parse({ ...enquiry, email }).status, 400);
  assert.equal(parse({ ...enquiry, email: 'first.last+enquiry@example.com.au' }).data.email, 'first.last+enquiry@example.com.au');
});

test('general enquiry honeypots discard spam and valid requests escape owner HTML', async () => {
  const { request, sent } = server();
  assert.equal((await request({ ...enquiry, website: 'spam' })).statusCode, 200);
  assert.equal(sent.length, 0);
  assert.equal((await request({ ...enquiry, message: '<img src=x onerror=alert(1)>', enquiry_role: 'Support coordinator' })).statusCode, 200);
  assert.match(sent[0].html, /&lt;img/);
  assert.doesNotMatch(sent[0].html, /<img src=x/);
  assert.match(sent[0].text, /Support coordinator/);
  assert.doesNotMatch(sent[1].html, /onerror/);
  assert.doesNotMatch(sent[1].text, /onerror/);
});

test('acknowledgement failure does not discard an enquiry already delivered to the owner', async () => {
  const { request, sent } = server({ failAcknowledgement: true });
  const response = await request(enquiry);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { success: true, acknowledgementSent: false });
  assert.equal(sent.length, 1);
});

test('owner delivery failure and unsupported methods are explicit failures', async () => {
  assert.equal((await server({ failMail: true }).request(enquiry)).statusCode, 500);
  assert.equal((await server().request(enquiry, 'GET')).statusCode, 405);
});
