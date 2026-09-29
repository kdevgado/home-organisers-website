import { parseEnquiry } from '../lib/enquiry.js';

export const config = { path: '/.netlify/functions/send-email', rateLimit: { windowLimit: 5, windowSize: 180, aggregateBy: ['ip', 'domain'] } };

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

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatText = (value, fallback = "Not provided") => {
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  return trimmed || fallback;
};

const formatHtml = (value, fallback = "Not provided") =>
  escapeHtml(formatText(value, fallback)).replace(/\n/g, "<br />");

const splitServices = (services) => {
  if (Array.isArray(services)) {
    return services.map((service) => formatText(service)).filter(Boolean);
  }

  return formatText(services, "")
    .split(",")
    .map((service) => service.trim())
    .filter(Boolean);
};

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const methodNotAllowed = () => ({
  statusCode: 405,
  headers: { Allow: "POST", "Content-Type": "application/json" },
  body: JSON.stringify({ error: "Method Not Allowed" }),
});

const requiredEnv = [
  "GMAIL_USER",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
];

const missingEnv = () =>
  requiredEnv.filter((name) => !process.env[name] || !process.env[name].trim());

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed();
  }

  try {
    const envErrors = missingEnv();
    if (envErrors.length) {
      console.error(
        `send-email missing required environment variables: ${envErrors.join(
          ", "
        )}`
      );
      return json(500, { error: "Email service is not configured" });
    }

    const parsed = parseEnquiry(event);
    if (parsed.error) return json(parsed.status, { error: parsed.error });
    if (parsed.spam) return json(200, { success: true });
    const { data } = parsed;
    const isFollowUs = data.form_type === 'follow-us';

    const {
      name,
      email,
      phone,
      address,
      suburb,
      services,
      service,
      contact_method,
      referral_source,
      message,
      booking_date,
    } = data;

    const cleanEmail = formatText(email, "");
    const locationLabel = suburb ? 'Suburb/Town' : 'Address';
    const location = suburb || address;

    const selectedServices = splitServices(services || service);
    const servicesText = selectedServices.length
      ? selectedServices.join(", ")
      : "Not provided";

    const accessToken = await oAuth2Client.getAccessToken();

    if (!accessToken.token) throw new Error("No email access token");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      disableFileAccess: true, disableUrlAccess: true,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      auth: {
        type: "OAuth2",
        user: process.env.GMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    if (isFollowUs) {
      await transporter.sendMail({
        from: `"Website Sign-up" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        replyTo: cleanEmail,
        subject: "New Follow Us promotional sign-up",
        text: [
          "New Follow Us promotional sign-up",
          "",
          `Name: ${formatText(name)}`,
          `Email: ${cleanEmail}`,
          `Phone: ${formatText(phone)}`,
          "",
          "Consent: Agreed to receive freebies, organising tips and promotional updates from Home Organisers Australia.",
          `Received at: ${new Date().toISOString()}`,
          "Source: Follow Us page",
        ].join("\n"),
      });
      return json(200, { success: true });
    }

    const ownerText = [
      "New HomeOrg enquiry",
      "",
      `Name: ${formatText(name)}`,
      `Email: ${formatText(email)}`,
      `Phone: ${formatText(phone)}`,
      `${locationLabel}: ${formatText(location)}`,
      `Preferred contact method: ${formatText(contact_method)}`,
      `How they found us: ${formatText(referral_source)}`,
      `Enquiring as: ${formatText(data.enquiry_role)}`,
      `Services requested: ${servicesText}`,
      `Consultation preferred date: ${formatText(booking_date)}`,
      "",
      "Brief notes:",
      formatText(message),
    ].join("\n");

    const ownerHtml = `
      <div style="font-family: Georgia, 'Times New Roman', serif; background: #f4efe7; padding: 32px 16px; color: #2f261f;">
        <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e6dccf;">
          <div style="background: linear-gradient(135deg, #6f4e37, #b7895b); color: #ffffff; padding: 28px 32px;">
            <p style="margin: 0 0 8px; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.9;">Home Organisers Australia</p>
            <h1 style="margin: 0; font-size: 28px; line-height: 1.2;">New HomeOrg enquiry</h1>
          </div>
          <div style="padding: 28px 32px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 0 0 14px; font-weight: 700; width: 220px;">Name</td>
                <td style="padding: 0 0 14px;">${formatHtml(name)}</td>
              </tr>
              <tr>
                <td style="padding: 0 0 14px; font-weight: 700;">Email</td>
                <td style="padding: 0 0 14px;"><a href="mailto:${escapeHtml(
                  formatText(email, "")
                )}" style="color: #8a5a34; text-decoration: none;">${formatHtml(
      email
    )}</a></td>
              </tr>
              <tr>
                <td style="padding: 0 0 14px; font-weight: 700;">Phone</td>
                <td style="padding: 0 0 14px;">${formatHtml(phone)}</td>
              </tr>
              <tr>
                <td style="padding: 0 0 14px; font-weight: 700;">${locationLabel}</td>
                <td style="padding: 0 0 14px;">${formatHtml(location)}</td>
              </tr>
              <tr>
                <td style="padding: 0 0 14px; font-weight: 700;">Preferred contact</td>
                <td style="padding: 0 0 14px;">${formatHtml(contact_method)}</td>
              </tr>
              <tr>
                <td style="padding: 0 0 14px; font-weight: 700;">Enquiring as</td>
                <td style="padding: 0 0 14px;">${formatHtml(data.enquiry_role)}</td>
              </tr>
              <tr>
                <td style="padding: 0 0 14px; font-weight: 700;">Referral source</td>
                <td style="padding: 0 0 14px;">${formatHtml(referral_source)}</td>
              </tr>
              <tr>
                <td style="padding: 0 0 14px; font-weight: 700;">Services requested</td>
                <td style="padding: 0 0 14px;">${selectedServices.length
                  ? `<ul style="margin: 0; padding-left: 18px;">${selectedServices
                      .map(
                        (selectedService) =>
                          `<li style="margin-bottom: 6px;">${escapeHtml(
                            selectedService
                          )}</li>`
                      )
                      .join("")}</ul>`
                  : "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 0; font-weight: 700;">Preferred date</td>
                <td style="padding: 0;">${formatHtml(booking_date)}</td>
              </tr>
            </table>

            <div style="margin-top: 28px; padding: 22px; background: #f8f3ec; border-radius: 14px; border: 1px solid #eee2d5;">
              <p style="margin: 0 0 10px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #8a5a34; font-weight: 700;">Brief notes</p>
              <p style="margin: 0; line-height: 1.7;">${formatHtml(message)}</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"Website Enquiry" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: cleanEmail,
      subject: `New HomeOrg enquiry from ${formatText(name, "Website visitor")}`,
      text: ownerText,
      html: ownerHtml,
    };

    await transporter.sendMail(mailOptions);

    let acknowledgementSent = false;
    if (email) {
      const autoReplyText = [
        "Hello,",
        "",
        "Thanks for your enquiry to Home Organisers Australia.",
        "We've received your request and will be in touch soon to confirm the details.",
        "",
        "This is an enquiry, not a confirmed appointment.",
        "",
        "If you need to update anything, just reply to this email.",
        "",
        "Warm regards,",
        "Rowee Delgado",
        "Founder & Professional Home Organiser",
        "Phone: 0415 640 352",
        "Email: roweedelgado@homeorg.com.au",
        "Website: www.homeorg.com.au",
      ].join("\n");

      const autoReplyHtml = `
        <div style="font-family: Georgia, 'Times New Roman', serif; background: #f7f1e9; padding: 32px 16px; color: #2f261f;">
          <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e8ddd0;">
            <div style="background: linear-gradient(135deg, #d7b28a, #8a5a34); color: #ffffff; padding: 28px 32px;">
              <p style="margin: 0 0 8px; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.92;">Enquiry received</p>
              <h1 style="margin: 0; font-size: 28px; line-height: 1.2;">Thanks for reaching out</h1>
            </div>
            <div style="padding: 28px 32px;">
              <p style="margin: 0 0 16px; line-height: 1.7;">
                Thanks for your enquiry to <strong>Home Organisers Australia</strong>.
                We've received your request and will be in touch soon to confirm the details.
              </p>

              <p>This is an enquiry, not a confirmed appointment.</p>

              <p style="margin: 0 0 18px; line-height: 1.7;">
                If anything changes, simply reply to this email and we'll update your enquiry.
              </p>

              <p style="margin: 0; line-height: 1.8;">
                Warm regards,<br />
                <strong>Rowee Delgado</strong><br />
                Founder &amp; Professional Home Organiser<br />
                0415 640 352<br />
                <a href="mailto:roweedelgado@homeorg.com.au" style="color: #8a5a34; text-decoration: none;">roweedelgado@homeorg.com.au</a><br />
                <a href="https://www.homeorg.com.au" style="color: #8a5a34; text-decoration: none;">www.homeorg.com.au</a>
              </p>
            </div>
          </div>
        </div>
      `;

      try {
        await transporter.sendMail({
          from: `"Home Organisers Australia" <${process.env.GMAIL_USER}>`,
          to: cleanEmail,
          subject: "We received your enquiry",
          text: autoReplyText,
          html: autoReplyHtml,
          replyTo: process.env.GMAIL_USER,
        });
        acknowledgementSent = true;
      } catch {
        console.error("send-email: owner notified; acknowledgement failed");
      }
    }

    return json(200, { success: true, acknowledgementSent });
  } catch (err) {
    console.error("send-email: delivery failed");
    return json(500, { error: "Failed to send email" });
  }
}
