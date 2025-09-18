// netlify/functions/available-slots.js
import { DateTime, Interval } from "luxon";
import { getCalendarClient, intFromEnv } from "./google.js";

const {
  GOOGLE_CALENDAR_ID = "primary",
  BUSINESS_TIMEZONE = "Australia/Melbourne",
} = process.env;

const OPEN_HOUR = intFromEnv("OPEN_HOUR", 9);
const CLOSE_HOUR = intFromEnv("CLOSE_HOUR", 17);
const SLOT_MINUTES = intFromEnv("SLOT_MINUTES", 30);

export const handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const dateStr = params.date; // expected "YYYY-MM-DD" from your Flatpickr
    if (!dateStr) {
      return json({ slots: [] });
    }

    // Build the business-day window in BUSINESS_TIMEZONE
    const start = DateTime.fromISO(dateStr, { zone: BUSINESS_TIMEZONE }).set({
      hour: OPEN_HOUR,
      minute: 0,
      second: 0,
      millisecond: 0,
    });

    const end = start.set({ hour: CLOSE_HOUR });

    // Skip past times if same day (business rule)
    const nowLocal = DateTime.now().setZone(BUSINESS_TIMEZONE);
    const dayStart = start.startOf("day");
    const sameDay = nowLocal.hasSame(dayStart, "day");
    const effectiveStart = sameDay && nowLocal > start ? nowLocal : start;

    // Generate candidate slot starts
    const slots = [];
    let cursor = effectiveStart.startOf("minute");
    const step = { minutes: SLOT_MINUTES };
    while (cursor < end) {
      // Align to slot grid (e.g., 00/30 past the hour)
      const minute = cursor.minute;
      const mod = minute % SLOT_MINUTES;
      if (mod !== 0) {
        cursor = cursor.plus({ minutes: SLOT_MINUTES - mod });
        continue;
      }
      const slotEnd = cursor.plus(step);
      if (slotEnd > end) break;

      slots.push({ start: cursor, end: slotEnd });
      cursor = cursor.plus(step);
    }

    if (!slots.length) return json({ slots: [] });

    // Query Google freebusy to remove conflicts
    const calendar = getCalendarClient();
    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: start.toUTC().toISO(),
        timeMax: end.toUTC().toISO(),
        timeZone: BUSINESS_TIMEZONE,
        items: [{ id: GOOGLE_CALENDAR_ID }],
      },
    });

    const busy = (fb?.data?.calendars?.[GOOGLE_CALENDAR_ID]?.busy || []).map(
      (b) => ({
        start: DateTime.fromISO(b.start, { zone: "utc" }),
        end: DateTime.fromISO(b.end, { zone: "utc" }),
      })
    );

    // Filter out any slot that overlaps with a busy interval
    const freeIsos = slots
      .filter(({ start: s, end: e }) => {
        const sUtc = s.toUTC();
        const eUtc = e.toUTC();
        return !busy.some(({ start: bs, end: be }) =>
          Interval.fromDateTimes(bs, be).overlaps(
            Interval.fromDateTimes(sUtc, eUtc)
          )
        );
      })
      // Return slot starts as ISO strings in UTC; your client renders them in local time
      .map(({ start: s }) => s.toUTC().toISO());

    return json({ slots: freeIsos });
  } catch (err) {
    console.error(err);
    return json({ slots: [] }, 200); // don’t 500 just for UX
  }
};

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
