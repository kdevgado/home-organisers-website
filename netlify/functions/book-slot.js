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
    return resp(405, "Method Not Allowed");
  }

  try {
    const data = JSON.parse(event.body || "{}");
    const {
      name,
      email,
      phone = "",
      suburb = "",
      service = "",
      message = "",
    } = data;

    // Configure transporter using your SMTP vars
    const transporter = nodemailer.createTransport({
      host: GMAIL_HOST,
      port: Number(GMAIL_PORT) || 465,
      secure: GMAIL_SECURE === "true", // true = 465, false = other ports
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: MAIL_FROM,
      to: MAIL_TO,
      subject: `New Consultation Request – ${name}`,
      text: `
New booking request:

Name: ${name}
Email: ${email}
Phone: ${phone}
Suburb/Town: ${suburb}
Service: ${service}
Notes: ${message}
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

function resp(statusCode, text) {
  return {
    statusCode,
    headers: { "Content-Type": "text/plain" },
    body: text,
  };
}
