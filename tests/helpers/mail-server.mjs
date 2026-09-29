import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parseEnquiry } from '../../netlify/lib/enquiry.js';
// Mock external email services so these checks never send real messages.
export function server({ failMail = false, failAcknowledgement = false } = {}) {
  const sent = [];
  const context = vm.createContext({
    console: { error() {} },
    parseEnquiry,
    process: { env: Object.fromEntries(
      ["GMAIL_USER", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"]
        .map((key) => [key, "test"]),
    ) },
    google: { auth: { OAuth2: class {
      setCredentials() {}
      async getAccessToken() { return { token: "test" }; }
    } } },
    nodemailer: { createTransport: () => ({ async sendMail(mail) {
      if (failMail || (failAcknowledgement && sent.length === 1)) throw new Error("Email unavailable");
      sent.push(mail);
    } }) },
  });
  const source = readFileSync(new URL("../../netlify/functions/send-email.js", import.meta.url), "utf8")
    .replace(/^import .*;\r?\n/gm, "")
    .replace("export async function handler", "async function handler")
    .replace("export const config", "const config");
  vm.runInContext(source, context);
  return {
    sent,
    request: (data, method = "POST") => context.handler({ httpMethod: method, body: JSON.stringify(data) }),
  };
}
