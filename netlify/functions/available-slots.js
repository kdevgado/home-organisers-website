import { google } from "googleapis";

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method Not Allowed" }, { Allow: "GET" });
  }

  const date = event.queryStringParameters?.date;
  if (!date) return json(400, { error: "Missing date" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json(400, { error: "Date must use YYYY-MM-DD format" });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.error("available-slots missing GOOGLE_SERVICE_ACCOUNT_KEY");
    return json(500, { error: "Calendar service is not configured" });
  }

  try {
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch {
      console.error("available-slots has invalid GOOGLE_SERVICE_ACCOUNT_KEY JSON");
      return json(500, { error: "Calendar service is not configured" });
    }

    // Authenticate with your service account
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const calendar = google.calendar({ version: "v3", auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

    const timeMin = new Date(`${date}T09:00:00+10:00`); // Start of business hours
    const timeMax = new Date(`${date}T17:00:00+10:00`); // End of business hours

    // Generate all 30-min slots
    const slots = [];
    let current = new Date(timeMin);
    while (current < timeMax) {
      slots.push(new Date(current));
      current.setMinutes(current.getMinutes() + 30);
    }

    // Query free/busy
    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busy = fb.data.calendars?.[calendarId]?.busy || [];
    const available = slots.filter((slot) => {
      const iso = slot.toISOString();
      // Exclude if in the past
      if (slot < new Date()) return false;
      // Exclude if overlaps busy
      return !busy.some((b) => iso >= b.start && iso < b.end);
    });

    return json(200, { slots: available.map((s) => s.toISOString()) });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Error fetching slots" });
  }
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  };
}
