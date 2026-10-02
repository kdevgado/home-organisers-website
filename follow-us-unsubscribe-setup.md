# Follow Us unsubscribe setup

This change targets the existing `live` branch. It removes confirmed opt-outs
from the spreadsheet imported from promotional emails. Signup notifications
continue to work as before; this change does not add automatic signup storage or
a campaign sender.

## Netlify production configuration

Set these variables with Functions scope:

- `FOLLOW_US_SPREADSHEET_ID`: the private signup spreadsheet ID, copied from
  its URL between `/d/` and `/edit`. Keep this value in Netlify rather than GitHub.
- `FOLLOW_US_UNSUBSCRIBE_SECRET`: a private random string of at least 32
  characters. Generate one locally with
  `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
  Keep it out of GitHub and browser code. Changing it invalidates outstanding links.
- Keep `GMAIL_USER`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and
  `GOOGLE_REFRESH_TOKEN` configured.

Enable Google Sheets API in the OAuth application's Google Cloud project.
The Google account authorised by the refresh token must have Editor access to
this spreadsheet. General access should stay Restricted.

Reauthorise the existing OAuth client with all its existing mail/calendar scopes
**plus** `https://www.googleapis.com/auth/spreadsheets`. A refresh token previously
issued with only Gmail/Calendar permission cannot edit Sheets. If using OAuth
Playground, select Settings → Use your own OAuth credentials, supply your existing
client ID/secret, authorise the combined scopes with the same account, exchange
the code and replace `GOOGLE_REFRESH_TOKEN` in Netlify. Preserve the previous
configuration privately until mail/calendar checks pass. Do not post credentials
in chat or commit them. No service-account JSON key is needed.

Merge into the `live` deployment branch and trigger a production deployment
after setting these variables. An Astro local server does not run Netlify
Functions; use Netlify Dev for integrated local verification.

## Behaviour

1. On `/follow-us/`, enter an email in Unsubscribe.
2. A confirmation email contains a signed link valid for 24 hours.
3. Opening the link does not change data. Press **Confirm unsubscribe**.
4. The backend verifies the signature, reads the `Signups` tab, matches trimmed
   case-insensitive emails and clears every matching record in columns A:I.
5. Success appears only after the Sheets write completes. Repeat confirmation
   succeeds when there is no matching entry. Failures retain a retry option.

Clearing the complete record leaves a blank row rather than shifting rows. This
prevents concurrent unsubscribe requests selecting and deleting another person's
row after row numbers change. All nine columns are cleared, including phone,
consent and source-email links. Headers, formatting and other entries remain.
Do not manually sort, insert or delete rows while an opt-out request is executing.
Do not store extra subscriber data beyond column I without extending removal.

Use the current sheet for campaigns, excluding blank rows. Previously downloaded
lists and mailing tools are not automatically updated. This sheet is a current
list after removal, rather than an immutable history. A repeat signup does not
automatically restore a cleared record because this branch only emails signups.

## Verification before using the feature

- Run `npm test`, `npm run lint`, `npm run check`, `npm run build`.
- Use a separate test spreadsheet with the same headers for preview deployments.
- Add two test records with the same owner-controlled email and one unrelated
  record. Request and confirm an unsubscribe. Both matching records must be
  cleared, the unrelated record must remain, and the header must remain.
- Repeat confirmation, try an expired/modified link, and simulate revoked Sheets
  permission. Only confirmed writes should display unsubscribe success.
- Verify existing consultation notifications and calendar requests after OAuth
  reauthorisation. Automated tests mock all external services and send no emails.

Google Sheets value clearing and OAuth scopes:
https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/clear
