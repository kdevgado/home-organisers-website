import { google } from "googleapis";
import { DateTime } from "luxon";

const CALENDAR_TIMEZONE = "Australia/Melbourne";
export const config = { path: '/.netlify/functions/available-slots', rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] } };

export async function handler(event) {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method Not Allowed" }, { Allow: "GET" });
  }

  const date = event.queryStringParameters?.date;
  if (!date) return json(400, { error: "Missing date" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json(400, { error: "Date must use YYYY-MM-DD format" });
  }
  const day = DateTime.fromISO(date, { zone: CALENDAR_TIMEZONE });
  const today = DateTime.now().setZone(CALENDAR_TIMEZONE).startOf('day');
  if (!day.isValid || day < today || day > today.plus({ days: 180 })) {
    return json(400, { error: "Choose a valid date within the next 180 days" });
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
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });
    const calendar = google.calendar({ version: "v3", auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

    const timeMin = DateTime.fromISO(`${date}T09:00:00`, {
      zone: CALENDAR_TIMEZONE,
    }).toJSDate();
    const timeMax = DateTime.fromISO(`${date}T17:00:00`, {
      zone: CALENDAR_TIMEZONE,
    }).toJSDate();

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

    const result = fb.data.calendars?.[calendarId];
    if (!result || result.errors?.length || !Array.isArray(result.busy)) {
      return json(502, { error: "Calendar availability could not be confirmed" });
    }
    const busy = result.busy;
    if (busy.some(b => !Number.isFinite(Date.parse(b.start)) || !Number.isFinite(Date.parse(b.end)) || Date.parse(b.end) <= Date.parse(b.start))) {
      return json(502, { error: "Calendar availability could not be confirmed" });
    }
    const available = slots.filter((slot) => {
      // Exclude if in the past
      if (slot < new Date()) return false;
      // Exclude if overlaps busy
      const slotEnd = slot.getTime() + 30 * 60 * 1000;
      return !busy.some((b) => slot.getTime() < Date.parse(b.end) && slotEnd > Date.parse(b.start));
    });

    return json(200, { slots: available.map((s) => s.toISOString()) });
  } catch (err) {
    console.error("available-slots: calendar request failed");
    return json(500, { error: "Error fetching slots" });
  }
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders },
    body: JSON.stringify(body),
  };
}
