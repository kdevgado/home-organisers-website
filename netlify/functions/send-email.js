// netlify/functions/send-email.js
import nodemailer from "nodemailer";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Expect application/json from the client
    const payload = JSON.parse(event.body || "{}");

    // Pull env vars from Netlify dashboard
    const {
      SMTP_HOST,
      SMTP_PORT = "587",
      SMTP_SECURE = "false", // 'true' for 465, 'false' for 587
      SMTP_USER,
      SMTP_PASS,
      MAIL_TO = "rdelgado@homeorg.com.au",
      MAIL_CC, // optional, e.g., admin@homeorg.com.au
      MAIL_FROM = "Shepparton Home Organising <no-reply@homeorg.com.au>",
      MAIL_AUTOREPLY = "true", // 'false' to disable autoresponder
    } = process.env;

    // Build transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: SMTP_SECURE === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const {
      name,
      email,
      phone,
      suburb,
      service,
      message,
      preferred_days,
      preferred_time_from,
      preferred_time_to,
      timeline,
    } = payload;

    const subject = `New enquiry from ${name} (${email})`;
    const replyTo = email && /@/.test(email) ? email : undefined;

    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;line-height:1.5;color:#0f172a">
        <h2 style="margin:0 0 8px">New website enquiry</h2>
        <p style="margin:0 0 16px;color:#334155">via homeorg.com.au/contact</p>
        <table style="border-collapse:collapse;width:100%;max-width:640px">
          <tr><td style="padding:6px 0;width:180px;color:#64748b">Name</td><td>${
            name || "-"
          }</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Email</td><td>${
            email || "-"
          }</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Phone</td><td>${
            phone || "-"
          }</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Suburb/Town</td><td>${
            suburb || "-"
          }</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Service</td><td>${
            service || "-"
          }</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Timeline</td><td>${
            timeline || "-"
          }</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Preferred day(s)</td><td>${
            preferred_days || "-"
          }</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Preferred time</td><td>${
            preferred_time_from || "-"
          } — ${preferred_time_to || "-"}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
        <p style="white-space:pre-wrap">${(message || "").trim()}</p>
      </div>
    `;

    // Send to your org mailbox
    await transporter.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      cc: MAIL_CC || undefined,
      subject,
      html,
      replyTo,
    });

    // Optional autoreply to the customer
    if (MAIL_AUTOREPLY === "true" && email) {
      await transporter.sendMail({
        from: MAIL_FROM,
        to: email,
        subject: `Thanks for your enquiry — Shepparton Home Organising`,
        html: `
          <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;line-height:1.5;color:#0f172a">
            <p>Hi ${name || ""},</p>
            <p>Thanks for reaching out! We've received your message and will get back to you soon.</p>
            <p><strong>What happens next?</strong><br/>We'll check your preferred days/times and reply to book a quick 15-minute chat.</p>
            <p>Warmly,<br/>Shepparton Home Organising</p>
          </div>
        `,
      });
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Email send failed" };
  }
};
