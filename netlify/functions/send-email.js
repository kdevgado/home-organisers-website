import nodemailer from "nodemailer";
import { google } from "googleapis";

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);
oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);

    const { name, email, phone, suburb, service, message, booking_date } = data;

    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const mailOptions = {
      from: `"Website Enquiry" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: email,
      subject: `New enquiry: ${service} — ${name}`,
      text: `
      Name: ${name}
      Email: ${email}
      Phone: ${phone || "N/A"}
      Suburb/Town: ${suburb || "N/A"}
      Service: ${service}
      Booking date: ${booking_date || "N/A"}

      Message:
      ${message || "N/A"}
      `,
      html: `
        <h2>New Enquiry</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Suburb/Town:</strong> ${suburb || "N/A"}</p>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Booking date:</strong> ${booking_date || "N/A"}</p>
        <h3>Message</h3>
        <p>${message ? message.replace(/\n/g, "<br>") : "N/A"}</p>
      `,
    };

    // Send to site owner (you)
    await transporter.sendMail(mailOptions);

    // Auto-reply to user
    if (email) {
      const autoReply = {
        from: `"Home Organisers Australia" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Thanks for reaching out!",
        text: `
Hi ${name},

Thanks for contacting Home Organisers Australia. 
We've received your enquiry and will get back to you shortly.

Here's a copy of what you sent:
--------------------------------
Service: ${service}
Booking date: ${booking_date || "N/A"}
Message:
${message || "N/A"}
--------------------------------

Talk soon,  
Rowee & John  
Home Organisers Australia
    `,
        html: `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thanks for contacting <strong>Home Organisers Australia</strong>. 
      We've received your enquiry and will get back to you shortly.</p>

      <p><em>Here's a copy of what you sent:</em></p>
      <hr>
      <p><strong>Service:</strong> ${service}</p>
      <p><strong>Booking date:</strong> ${booking_date || "N/A"}</p>
      <p><strong>Message:</strong><br>${
        message ? message.replace(/\n/g, "<br>") : "N/A"
      }</p>
      <hr>

      <p>Talk soon,<br>
      Rowee & John<br>
      <strong>Home Organisers Australia</strong></p>
    `,
      };

      await transporter.sendMail(autoReply);
    }

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
