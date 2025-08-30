// /netlify/functions/book-slot.js
import { google } from "googleapis";

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const {
      name,
      email,
      phone,
      suburb,
      service,
      message,
      slotIso,
      durationMinutes = 30,
      timezone,
    } = body;

    if (!name || !email || !slotIso) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    const tz = timezone || process.env.BUSINESS_TZ || "Australia/Melbourne";
    const start = new Date(slotIso);
    const end = new Date(start.getTime() + durationMinutes * 60000);

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

    // Double-check conflict (in case someone grabbed it meanwhile)
    const { data: freebusy } = await calendar.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: calendarId }],
        timeZone: tz,
      },
    });
    const busy = freebusy.calendars?.[calendarId]?.busy || [];
    if (busy.length) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Time slot no longer available" }),
      };
    }

    // Create event
    const summary = `30-min Consultation — ${
      service || "Home Organising"
    } (${name})`;
    const description = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      suburb ? `Suburb: ${suburb}` : null,
      service ? `Service: ${service}` : null,
      message ? `Notes: ${message}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const { data: evt } = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary,
        description,
        start: { dateTime: start.toISOString(), timeZone: tz },
        end: { dateTime: end.toISOString(), timeZone: tz },
        attendees: [{ email, displayName: name }],
        reminders: { useDefault: true },
      },
      sendUpdates: "all", // emails the attendee
    });

    // fire-and-forget email (don't block the response to the browser)
    try {
      await fetch(
        process.env.URL
          ? `${process.env.URL}/.netlify/functions/send-email`
          : "/.netlify/functions/send-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            phone,
            suburb,
            service,
            message,
            eventLink: evt.htmlLink,
            startIso: start.toISOString(),
            endIso: end.toISOString(),
            timezone: tz,
          }),
        }
      );
    } catch {}

    return {
      statusCode: 200,
      body: JSON.stringify({ calendarEventLink: evt.htmlLink }),
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Booking error" }),
    };
  }
}
