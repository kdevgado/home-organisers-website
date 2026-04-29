// netlify/functions/book-slot.js
import nodemailer from "nodemailer";

const {
  MAIL_FROM,
  MAIL_TO,
  GMAIL_HOST,
  GMAIL_PORT,
  GMAIL_USER,
  GMAIL_PASS,
  GMAIL_SECURE,
} = process.env;

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return resp(405, "Method Not Allowed", { Allow: "POST" });
  }

  try {
    const envErrors = missingEnv([
      "MAIL_FROM",
      "MAIL_TO",
      "GMAIL_HOST",
      "GMAIL_USER",
      "GMAIL_PASS",
    ]);
    if (envErrors.length) {
      console.error(
        `book-slot missing required environment variables: ${envErrors.join(
          ", "
        )}`
      );
      return json({ error: "Email service is not configured" }, 500);
    }

    const parsed = parseJson(event.body);
    if (parsed.error) return json({ error: parsed.error }, 400);

    const data = parsed.data;
    const {
      name,
      email,
      phone = "",
      suburb = "",
      service = "",
      message = "",
    } = data;

    const cleanEmail = formatText(email, "");
    if (!formatText(name, "") || !isEmail(cleanEmail)) {
      return json({ error: "Name and a valid email are required" }, 400);
    }

    const port = Number(GMAIL_PORT) || 465;

    // Configure transporter using your SMTP vars.
    const transporter = nodemailer.createTransport({
      host: GMAIL_HOST,
      port,
      secure: GMAIL_SECURE ? GMAIL_SECURE === "true" : port === 465,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: MAIL_FROM,
      to: MAIL_TO,
      replyTo: cleanEmail,
      subject: `New Consultation Request - ${formatText(name)}`,
      text: `
New booking request:

Name: ${formatText(name)}
Email: ${cleanEmail}
Phone: ${formatText(phone)}
Suburb/Town: ${formatText(suburb)}
Service: ${formatText(service)}
Notes: ${formatText(message)}
`,
    };

    await transporter.sendMail(mailOptions);

    return json({ success: true, message: "Email sent" });
  } catch (err) {
    console.error("Email send error:", err);
    return resp(500, "Email failed");
  }
};

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function resp(statusCode, text, extraHeaders = {}) {
  return {
    statusCode,
    headers: { "Content-Type": "text/plain", ...extraHeaders },
    body: text,
  };
}

function missingEnv(names) {
  return names.filter((name) => !process.env[name] || !process.env[name].trim());
}

function parseJson(body) {
  try {
    return { data: JSON.parse(body || "{}") };
  } catch {
    return { error: "Invalid JSON body" };
  }
}

function formatText(value, fallback = "Not provided") {
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  return trimmed || fallback;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
