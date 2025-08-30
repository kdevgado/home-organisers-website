// /netlify/functions/available-slots.js
import { google } from "googleapis";

export async function handler(event) {
  try {
    const date = (event.queryStringParameters?.date || "").trim(); // "YYYY-MM-DD"
    if (!date)
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing date" }),
      };

    const tz = process.env.BUSINESS_TZ || "Australia/Melbourne";
    const duration = 30; // minutes, fixed

    // Working window (local): 09:00–17:00
    const [startH, endH] = (process.env.WORK_HOURS || "09:00-17:00").split("-");
    const dayStart = new Date(`${date}T${startH || "09:00"}:00`);
    const dayEnd = new Date(`${date}T${endH || "17:00"}:00`);

    // Auth
    const jwt = new google.auth.JWT(
      process.env.GCAL_CLIENT_EMAIL,
      null,
      (process.env.GCAL_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/calendar"]
    );
    await jwt.authorize();
    const calendar = google.calendar({ version: "v3", auth: jwt });
    const calendarId = process.env.GCAL_CALENDAR_ID;

    // Get busy windows for the day
    const { data: freebusy } = await calendar.freebusy.query({
      requestBody: {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: calendarId }],
        timeZone: tz,
      },
    });

    const busy = (freebusy.calendars?.[calendarId]?.busy || []).map((b) => ({
      start: new Date(b.start),
      end: new Date(b.end),
    }));

    // Build 30-min grid
    const slots = [];
    for (
      let t = new Date(dayStart);
      t < dayEnd;
      t = new Date(t.getTime() + duration * 60000)
    ) {
      const slotStart = new Date(t);
      const slotEnd = new Date(t.getTime() + duration * 60000);

      // Overlap check
      const overlaps = busy.some(
        (b) => Math.max(slotStart, b.start) < Math.min(slotEnd, b.end)
      );
      if (!overlaps) slots.push(slotStart.toISOString()); // return ISO; client will render local time
    }

    return { statusCode: 200, body: JSON.stringify({ slots }) };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to load slots" }),
    };
  }
}
