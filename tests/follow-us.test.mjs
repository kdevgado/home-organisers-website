import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { server } from "./helpers/mail-server.mjs";

const signup = { form_type: "follow-us", name: "Guest", email: "guest@example.com", consent: true };

test("promotional sign-up sends one owner notification with consent and no booking requirements", async () => {
  const { request, sent } = server();
  assert.equal((await request(signup)).statusCode, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "test");
  assert.equal(sent[0].replyTo, signup.email);
  assert.match(sent[0].subject, /Follow Us/);
  assert.match(sent[0].text, /Consent: Agreed/);
  assert.match(sent[0].text, /Phone: Not provided/);
  assert.doesNotMatch(sent[0].text, /consultation|Preferred date/);
});

test("invalid details or missing explicit consent do not send email", async () => {
  const { request, sent } = server();
  for (const change of [
    { name: "   " }, { name: {} }, { email: "invalid" }, { email: "a@b.com\r\n" },
    { consent: false }, { consent: "true" }, { consent: undefined }, { phone: {} },
  ]) assert.equal((await request({ ...signup, ...change })).statusCode, 400);
  assert.equal(sent.length, 0);
});

test("honeypot submissions are discarded", async () => {
  const { request, sent } = server();
  assert.equal((await request({ ...signup, website: "spam" })).statusCode, 200);
  assert.equal(sent.length, 0);
});

test("email failures return an error instead of success", async () => {
  const { request } = server({ failMail: true });
  assert.equal((await request(signup)).statusCode, 500);
});

test("consultations accept legacy addresses or suburbs and the expired competition rejects entries", async () => {
  const { request, sent } = server();
  const contact = { name: "Guest", email: "guest@example.com" };
  assert.equal((await request(contact)).statusCode, 400);
  assert.equal((await request({ ...contact, address: "12 Test Street" })).statusCode, 200);
  assert.match(sent[0].text, /Address: 12 Test Street/);
  assert.equal(sent.length, 2);
  assert.equal((await request({ ...contact, suburb: "Shepparton" })).statusCode, 200);
  assert.match(sent[2].text, /Suburb\/Town: Shepparton/);
  assert.equal((await request({ ...contact, service: "Competition Entry", suburb: "Shepparton" })).statusCode, 410);
});

function client(fetch) {
  let submit;
  let resets = 0;
  const elements = Object.fromEntries(Object.entries({ name: " Guest ", email: " guest@example.com ", phone: "", website: "" })
    .map(([key, value]) => [key, { value }]));
  elements.consent = { checked: true };
  const button = { disabled: true };
  const status = { dataset: {} };
  const form = {
    elements,
    querySelector: () => button,
    addEventListener: (_, fn) => { submit = fn; },
    reportValidity: () => elements.consent.checked,
    setAttribute() {}, removeAttribute() {},
    reset() { resets++; },
  };
  const context = vm.createContext({
    document: { getElementById: (id) => id === "follow-us-form" ? form : status },
    fetch,
    AbortSignal,
  });
  vm.runInContext(readFileSync(new URL("../public/js/follow-us.js", import.meta.url), "utf8"), context);
  return { elements, button, status, resets: () => resets, submit: () => submit({ preventDefault() {} }) };
}

test("client validates consent, trims details and prevents duplicate sends", async () => {
  let finish;
  const requests = [];
  const app = client((url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return new Promise((resolve) => { finish = resolve; });
  });
  app.elements.consent.checked = false;
  await app.submit();
  assert.equal(requests.length, 0);
  app.elements.consent.checked = true;
  const pending = app.submit();
  assert.equal(app.button.disabled, true);
  await app.submit();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.name, "Guest");
  assert.equal(requests[0].body.form_type, "follow-us");
  finish({ ok: true, json: async () => ({ success: true }) });
  await pending;
  assert.equal(app.resets(), 1);
  assert.match(app.status.textContent, /Thank you/);
  assert.equal(app.button.disabled, false);
});

test("client preserves details on failure and allows a retry", async () => {
  let attempts = 0;
  const app = client(async () => ({ ok: ++attempts > 1, json: async () => ({ success: true }) }));
  await app.submit();
  assert.equal(app.resets(), 0);
  assert.equal(app.status.dataset.error, "true");
  assert.equal(app.button.disabled, false);
  await app.submit();
  assert.equal(app.resets(), 1);
  assert.equal(app.status.dataset.error, "false");
});
