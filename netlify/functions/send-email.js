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
  headers: { "Content-Type": "application/json" },
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

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const parseBody = (body) => {
  try {
    return { data: JSON.parse(body || "{}") };
  } catch {
    return { error: "Invalid JSON body" };
  }
};

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

    const { data, error } = parseBody(event.body);
    if (error) {
      return json(400, { error });
    }

    const {
      name,
      email,
      phone,
      suburb,
      services,
      service,
      contact_method,
      referral_source,
      message,
      booking_date,
    } = data;

    const cleanEmail = formatText(email, "");
    if (!formatText(name, "") || !isEmail(cleanEmail)) {
      return json(400, { error: "Name and a valid email are required" });
    }

    const selectedServices = splitServices(services || service);
    const servicesText = selectedServices.length
      ? selectedServices.join(", ")
      : "Not provided";

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

    const ownerText = [
      "New consultation request",
      "",
      `Name: ${formatText(name)}`,
      `Email: ${formatText(email)}`,
      `Phone: ${formatText(phone)}`,
      `Suburb/Town: ${formatText(suburb)}`,
      `Preferred contact method: ${formatText(contact_method)}`,
      `How they found us: ${formatText(referral_source)}`,
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
            <h1 style="margin: 0; font-size: 28px; line-height: 1.2;">New consultation request</h1>
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
                <td style="padding: 0 0 14px; font-weight: 700;">Suburb/Town</td>
                <td style="padding: 0 0 14px;">${formatHtml(suburb)}</td>
              </tr>
              <tr>
                <td style="padding: 0 0 14px; font-weight: 700;">Preferred contact</td>
                <td style="padding: 0 0 14px;">${formatHtml(contact_method)}</td>
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
      subject: `New consultation request from ${formatText(name, "Website visitor")}`,
      text: ownerText,
      html: ownerHtml,
    };

    await transporter.sendMail(mailOptions);

    if (email) {
      const autoReplyText = [
        `Hi ${formatText(name, "there")},`,
        "",
        "Thanks for booking a consultation with Home Organisers Australia.",
        "We've received your request and will be in touch soon to confirm the details.",
        "",
        "Your submission summary",
        `Preferred date: ${formatText(booking_date)}`,
        `Preferred contact method: ${formatText(contact_method)}`,
        `Services requested: ${servicesText}`,
        `Brief notes: ${formatText(message)}`,
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
              <p style="margin: 0 0 8px; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.92;">Booking received</p>
              <h1 style="margin: 0; font-size: 28px; line-height: 1.2;">Thanks for reaching out, ${formatHtml(
                name,
                "there"
              )}</h1>
            </div>
            <div style="padding: 28px 32px;">
              <p style="margin: 0 0 16px; line-height: 1.7;">
                Thanks for booking a consultation with <strong>Home Organisers Australia</strong>.
                We've received your request and will be in touch soon to confirm the details.
              </p>

              <div style="margin: 24px 0; padding: 22px; background: #fbf7f2; border-radius: 14px; border: 1px solid #eee3d7;">
                <p style="margin: 0 0 12px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #8a5a34; font-weight: 700;">Your submission summary</p>
                <p style="margin: 0 0 10px;"><strong>Preferred date:</strong> ${formatHtml(
                  booking_date
                )}</p>
                <p style="margin: 0 0 10px;"><strong>Preferred contact method:</strong> ${formatHtml(
                  contact_method
                )}</p>
                <p style="margin: 0 0 10px;"><strong>Services requested:</strong> ${formatHtml(
                  servicesText
                )}</p>
                <p style="margin: 0;"><strong>Brief notes:</strong><br />${formatHtml(
                  message
                )}</p>
              </div>

              <p style="margin: 0 0 18px; line-height: 1.7;">
                If anything changes, simply reply to this email and we'll update your booking request.
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

      await transporter.sendMail({
        from: `"Home Organisers Australia" <${process.env.GMAIL_USER}>`,
        to: cleanEmail,
        subject: "We received your consultation request",
        text: autoReplyText,
        html: autoReplyHtml,
      });
    }

    return json(200, { success: true });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Failed to send email" });
  }
}
