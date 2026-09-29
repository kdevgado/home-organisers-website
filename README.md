# Home Organisers Australia

Static Astro website for HomeOrg, based in Shepparton and serving the Goulburn
Valley and Northern Victoria. Pages use Astro components, CSS and browser
JavaScript. Netlify Functions handle enquiries; there is no database.

## Development

Use Node 22.13+ (22.x) or Node 24+. Install with `npm ci`, then `npm run dev`.
The production output is `dist/`.

The project uses Astro 6.4.8 and the official Rollup WebAssembly package so builds
work on this managed Windows device. Sharp 0.35.4 and esbuild 0.28.1 are pinned
through overrides for security fixes. Astro itself still has an npm advisory
entry; see the audit report for exposure and the deferred Astro 7 upgrade.

```sh
npm test
npm run lint
npm run check
npm run build
npm run test:e2e
```

Browser tests use installed Chrome on Windows and Playwright Chromium elsewhere
(`npx playwright install chromium`). They serve the production build on port 4322,
mock enquiry responses and block external provider requests. No real email is sent.
The ordinary Astro dev/preview server does not emulate Netlify Functions.

## Deployment and email

Netlify is the deployment target: `netlify.toml` defines the build, output, Node
version, functions and security headers. GitHub Actions validates changes; it no
longer publishes a static-only copy to GitHub Pages, where enquiries cannot run.
Existing domain redirects remain in `public/_redirects`.

Set server-only variables in Netlify environment settings. `.env.example` lists
names and optional legacy configuration; never put credentials in `PUBLIC_`
variables or commit local environment files.

| Function | Purpose | Configuration |
| --- | --- | --- |
| `send-email` | Consultation/quote enquiry or consented promotional sign-up | `GMAIL_USER`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` |
| `book-slot` | Retained legacy SMTP enquiry route; does not reserve a time | `MAIL_FROM`, `MAIL_TO`, `GMAIL_HOST`, `GMAIL_PORT`, `GMAIL_USER`, `GMAIL_PASS`, `GMAIL_SECURE` |
| `available-slots` | Optional Google Calendar free/busy; not connected to contact UI | `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON), `GOOGLE_CALENDAR_ID` |

The API accepts JSON with name, email and suburb or address, plus contact and
service details. The restored contact page uses the original required name, email,
phone, address, contact method, referral source and preferred date fields, service
selection buttons and optional notes. Dates are requests, not bookings.
The owner must receive the message before success is returned. A failed visitor
acknowledgement returns success with `acknowledgementSent: false` to avoid a
misleading retry. Emails are transport acceptance, not proof of inbox delivery.
There is no durable database/queue, and a network timeout after provider acceptance
can still leave delivery uncertain. The client retains details on unconfirmed
submissions and offers direct contact details.

Both mail endpoints have bounded validation, honeypot handling and Netlify
per-IP/domain rate-limit configuration. Check Netlify's post-processing deploy log
for acceptance of each rule; local preview cannot prove deployed enforcement.
No CORS access is granted to other origins. The contact page does not upload files
or request diagnoses, participant numbers or plan documents.

## Content and assets

- Edit routes in `src/pages`; shared navigation, metadata and business schema are
  in `src/layouts/Base.astro`.
- `Photo.astro` processes existing local photos to responsive WebP at build time.
  Originals in `public/images` and their URLs remain available. Every new photo
  needs appropriate alt text; do not invent a project description from a filename.
- Service tabs share `public/js/service-tabs.js`; gallery uses a native dialog.
- Facebook and Instagram feeds are displayed automatically and use browser lazy
  loading. Google Fonts, Flatpickr and the social feeds remain external services.
  The contact date field still works if Flatpickr cannot load. YouTube loads when
  a visitor chooses to play a gallery video.
- The public Decap CMS admin is retained, but its collections point to folders
  that public pages do not consume. Do not assume CMS edits update the site.
  Netlify Identity/Git Gateway configuration and access must be checked separately.
- The March 2026 competition URL remains available as a clearly closed archive.

See [audit plan](docs/audit-plan.md), [audit report](docs/audit-report.md) and
[commit messages](docs/commit-messages.md) for findings, evidence and future work.
