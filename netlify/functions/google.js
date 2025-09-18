// netlify/functions/google.js
import { google } from "googleapis";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } =
  process.env;

let cachedClient;

/**
 * Returns an authorized Google Calendar client using OAuth2 + refresh token.
 */
export function getCalendarClient() {
  if (cachedClient) return cachedClient;

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
    // Redirect not needed here because we’re using a stored refresh token.
    // (It *is* required when you initially generate the refresh token.)
  );

  oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  cachedClient = calendar;
  return calendar;
}

/**
 * Utility: clamp and parse integers with defaults.
 */
export function intFromEnv(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) ? v : fallback;
}
