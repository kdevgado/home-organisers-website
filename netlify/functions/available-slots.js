import { google } from "googleapis";

export async function handler(event) {
  const { date } = event.queryStringParameters;
  if (!date) return { statusCode: 400, body: "Missing date" };

  try {
    // Authenticate with your service account
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    const calendar = google.calendar({ version: "v3", auth });

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
        items: [{ id: "primary" }],
      },
    });

    const busy = fb.data.calendars.primary.busy || [];
    const available = slots.filter((slot) => {
      const iso = slot.toISOString();
      // Exclude if in the past
      if (slot < new Date()) return false;
      // Exclude if overlaps busy
      return !busy.some((b) => iso >= b.start && iso < b.end);
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ slots: available.map((s) => s.toISOString()) }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Error fetching slots" };
  }
}
