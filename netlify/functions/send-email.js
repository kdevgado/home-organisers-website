// /netlify/functions/send-email.js
import fetch from "node-fetch";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.FROM_EMAIL;
const ADMIN = process.env.ADMIN_EMAIL;

export async function handler(event) {
  try {
    if (!RESEND_API_KEY || !FROM || !ADMIN) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Email not configured" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const {
      name = "",
      email = "",
      phone = "",
      suburb = "",
      service = "",
      message = "",
      eventLink = "", // optional: pass evt.htmlLink from book-slot
      startIso = "",
      endIso = "",
      timezone = "Australia/Melbourne",
    } = body;

    if (!name || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing name/email" }),
      };
    }

    const humanTime = (iso) => {
      if (!iso) return "";
      const d = new Date(iso);
      return d.toLocaleString([], {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: timezone,
      });
    };

    const startStr = humanTime(startIso);
    const endStr = humanTime(endIso);

    // 1) Send client confirmation
    const clientHtml = `
      <p>Hi ${name},</p>
      <p>You're booked for a 30-minute consultation${
        startStr ? ` on <strong>${startStr}</strong>` : ""
      }.</p>
      ${
        eventLink
          ? `<p><a href="${eventLink}">View your calendar event</a> (reschedule from there if needed).</p>`
          : ""
      }
      ${service ? `<p><strong>Service:</strong> ${service}</p>` : ""}
      ${
        message
          ? `<p><strong>Your note:</strong><br/>${escapeHtml(message)}</p>`
          : ""
      }
      <p>We look forward to helping you make home feel easy again.</p>
      <p>— Home Organisers Australia</p>
    `;

    // 2) Send internal notification
    const adminHtml = `
      <p><strong>New 30-min booking</strong></p>
      <ul>
        <li><strong>Name:</strong> ${escapeHtml(name)}</li>
        <li><strong>Email:</strong> ${escapeHtml(email)}</li>
        ${phone ? `<li><strong>Phone:</strong> ${escapeHtml(phone)}</li>` : ""}
        ${
          suburb
            ? `<li><strong>Suburb:</strong> ${escapeHtml(suburb)}</li>`
            : ""
        }
        ${
          service
            ? `<li><strong>Service:</strong> ${escapeHtml(service)}</li>`
            : ""
        }
        ${
          startStr
            ? `<li><strong>Start:</strong> ${startStr} (${timezone})</li>`
            : ""
        }
        ${
          endStr ? `<li><strong>End:</strong> ${endStr} (${timezone})</li>` : ""
        }
      </ul>
      ${
        message
          ? `<p><strong>Notes:</strong><br/>${escapeHtml(message)}</p>`
          : ""
      }
      ${
        eventLink ? `<p><a href="${eventLink}">Open calendar event</a></p>` : ""
      }
    `;

    await Promise.all([
      sendResend({
        to: email,
        subject: "Your booking is confirmed",
        html: clientHtml,
      }),
      sendResend({
        to: ADMIN,
        subject: "New booking received",
        html: adminHtml,
      }),
    ]);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Email send failed" }),
    };
  }
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        m
      ])
  );
}

async function sendResend({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend error: ${res.status} ${text}`);
  }
}
