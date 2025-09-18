// scripts/get-refresh-token.mjs
import http from "http";
import open from "open";
import { google } from "googleapis";

const PORT = 54321; // free local port
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

// 1) Fill these from your Google Cloud Console (OAuth 2.0 Client ID)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// 2) Scopes: Calendar read & write
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your env.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // ensure we get a refresh_token
  scope: SCOPES,
});

const server = http
  .createServer(async (req, res) => {
    if (req.url.startsWith("/oauth2callback")) {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const code = url.searchParams.get("code");
      if (!code) {
        res.end("No code found");
        return;
      }

      try {
        const { tokens } = await oauth2Client.getToken(code);
        res.end(
          "Success! You can close this tab. Check your terminal for the refresh token."
        );
        console.log("\n=== COPY THIS REFRESH TOKEN TO NETLIFY ===");
        console.log(tokens.refresh_token || "(no refresh token returned)");
        console.log("==========================================\n");
      } catch (e) {
        console.error(e);
        res.end("Error exchanging code for tokens.");
      } finally {
        server.close();
      }
    } else {
      res.end("OK");
    }
  })
  .listen(PORT, () => {
    console.log(`Opening Google consent screen...`);
    open(authUrl);
  });
