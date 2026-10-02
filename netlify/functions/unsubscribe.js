import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { unsubscribeHandler } from '../lib/unsubscribe.js';

export const config = { path: '/.netlify/functions/unsubscribe', rateLimit: { windowLimit: 5, windowSize: 180, aggregateBy: ['ip', 'domain'] } };

function auth() {
  for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN']) {
    if (!process.env[key]?.trim()) throw new Error('Google OAuth is not configured');
  }
  const client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return client;
}

export const handler = unsubscribeHandler({
  env: process.env,
  sheets: () => google.sheets({ version: 'v4', auth: auth() }),
  async sendConfirmation(email, link) {
    if (!process.env.GMAIL_USER?.trim()) throw new Error('Email is not configured');
    const { token } = await auth().getAccessToken();
    const transport = nodemailer.createTransport({ service: 'gmail', auth: {
      type: 'OAuth2', user: process.env.GMAIL_USER, clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET, refreshToken: process.env.GOOGLE_REFRESH_TOKEN, accessToken: token,
    } });
    await transport.sendMail({ from: `Home Organisers Australia <${process.env.GMAIL_USER}>`, to: email,
      subject: 'Confirm your HomeOrg unsubscribe request',
      text: `To stop receiving HomeOrg freebies, organising tips and promotional updates, open this link and select Confirm unsubscribe:\n\n${link}\n\nThis link expires in 24 hours. If you did not request this, you can ignore this email.\n\nRowee Delgado\nHome Organisers Australia`,
    });
  },
});
