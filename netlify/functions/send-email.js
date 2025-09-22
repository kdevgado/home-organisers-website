// netlify/functions/send-email.js
import nodemailer from "nodemailer";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    let data = {};
    const ctype =
      event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (ctype.includes("application/json")) {
      data = JSON.parse(event.body || "{}");
    } else if (ctype.includes("application/x-www-form-urlencoded")) {
      data = Object.fromEntries(new URLSearchParams(event.body));
    } else {
      // try JSON as a fallback
      try {
        data = JSON.parse(event.body || "{}");
      } catch {}
    }

    const {
      name = "",
      email = "",
      phone = "",
      suburb = "",
      service = "General enquiry",
      message = "",
      booking_date = "",
    } = data;

    if (!name.trim() || !email.trim()) {
      return { statusCode: 400, body: "Missing name or email" };
    }

    // Gmail SMTP with App Password
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"Website Enquiry" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // send to yourself
      replyTo: email,
      subject: `New enquiry: ${service} — ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || "N/A"}`,
        `Suburb/Town: ${suburb || "N/A"}`,
        `Service: ${service}`,
        `Booking date (if given): ${booking_date || "N/A"}`,
        ``,
        `Message:`,
        message || "N/A",
      ].join("\n"),
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Failed to send email" };
  }
}
