// netlify/functions/book-slot.js
import { DateTime, Interval } from "luxon";
import { getCalendarClient, intFromEnv } from "./google.js";

const {
  GOOGLE_CALENDAR_ID = "primary",
  BUSINESS_TIMEZONE = "Australia/Melbourne",
} = process.env;

const SLOT_MINUTES = intFromEnv("SLOT_MINUTES", 30);

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
      slotIso,
      durationMinutes,
    } = data;

    if (!name || !email || !slotIso) {
      return resp(400, "Missing required fields");
    }

    const minutes = Number(durationMinutes) || SLOT_MINUTES;
    const startUtc = DateTime.fromISO(slotIso, { zone: "utc" });
    if (!startUtc.isValid) return resp(400, "Invalid slot");

    const endUtc = startUtc.plus({ minutes: minutes });

    // Concurrency guard: check freebusy again just before insert
    const calendar = getCalendarClient();
    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: startUtc.toISO(),
        timeMax: endUtc.toISO(),
        items: [{ id: GOOGLE_CALENDAR_ID }],
      },
    });

    const busy = fb?.data?.calendars?.[GOOGLE_CALENDAR_ID]?.busy || [];
    const overlaps = busy.some((b) =>
      Interval.fromDateTimes(
        DateTime.fromISO(b.start, { zone: "utc" }),
        DateTime.fromISO(b.end, { zone: "utc" })
      ).overlaps(Interval.fromDateTimes(startUtc, endUtc))
    );

    if (overlaps) {
      return resp(409, "Slot no longer available");
    }

    // Build event details
    const startInBizTz = startUtc.setZone(BUSINESS_TIMEZONE);
    const endInBizTz = endUtc.setZone(BUSINESS_TIMEZONE);

    const description =
      [
        `Name: ${name}`,
        `Email: ${email}`,
        phone && `Phone: ${phone}`,
        suburb && `Suburb/Town: ${suburb}`,
        service && `Service: ${service}`,
        message && `Notes: ${message}`,
      ]
        .filter(Boolean)
        .join("\n") + `\n\nBooked via website.`;

    const eventBody = {
      summary: `Consultation – ${name}`,
      description,
      start: {
        dateTime: startInBizTz.toISO(),
        timeZone: BUSINESS_TIMEZONE,
      },
      end: {
        dateTime: endInBizTz.toISO(),
        timeZone: BUSINESS_TIMEZONE,
      },
      attendees: [{ email }], // customer
      // add yourself explicitly; some orgs prefer this for clarity
      // attendees: [{ email }, { email: "you@yourdomain.com" }],
      reminders: { useDefault: true },
      guestsCanInviteOthers: false,
      guestsCanModify: false,
      // Make it “busy” and send email
      transparency: "opaque",
      sendUpdates: "all",
    };

    const res = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: eventBody,
      sendUpdates: "all",
    });

    return json({
      success: true,
      calendarEventLink: res?.data?.htmlLink || "",
    });
  } catch (err) {
    console.error(err);
    return resp(500, "Booking failed");
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
