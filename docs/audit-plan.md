# HomeOrg independent audit and implementation plan

Date: 28 September 2026. This is the initial review; no earlier Astra report exists.
The working tree was clean at the start. Preserve routes, photography, testimonials,
brand colours, the 4Cs, and the static Astro architecture.

## Repository and journeys

- Astro 5 static pages, plain CSS and browser JavaScript; Node Netlify Functions,
  Nodemailer/Gmail OAuth email and Google Calendar free/busy. No database or React.
- Filesystem routing: home, services and five service details, about, 4Cs, gallery,
  follow-us, contact, competition and 404. Testimonials are on the homepage.
- Decap CMS admin points at content folders that no page consumes. Authentication
  is delegated to Netlify Identity/Git Gateway; no public account system exists.
- Netlify builds `dist`; a separate GitHub Pages workflow cannot run the functions.
- Enquiries post JSON to send-email. A separate SMTP book-slot endpoint sends email
  but does not book a slot. The availability endpoint is not used by the UI.
- No first-party analytics or conversion tracking found. Facebook, LightWidget,
  Google Fonts and gallery YouTube are third-party dependencies.
- General journey: home → service → contact. Contact unnecessarily requires full
  address, phone, referral source and date, then promises an unimplemented invite.
- NDIS journey: buried services link → specialised page containing only moving
  guidance → generic contact. Needs clearer practical support and referral context.
- Portfolio journey: home → gallery → contact. Photos are large and image-only
  gallery controls cannot be reached by keyboard.

## Confirmed priorities before implementation

| Priority | Problem and files | Safe solution / expected benefit | Regression risk |
| --- | --- | --- | --- |
| Critical | General enquiry validation accepts coerced input; public email endpoints lack bounded input and abuse controls (`netlify/functions`) | Validate type, size, email, contact preference and dates; honeypot and host rate limits; generic errors | Existing callers: retain legacy address and SMTP endpoint compatibility |
| High | Owner email can succeed but failed auto-reply returns failure (`send-email.js`) | Separate acknowledgement outcome; prevent misleading retries and duplicate leads | Verify each partial delivery outcome with mocked mail |
| High | Contact promises available times/calendar invites but sends only a request (`contact.astro`, `contact.js`) | Honest request wording, native validation, optional preferred date, persistent feedback and direct phone/email | Verify contact, NDIS, failure and retry flows |
| High | Uncaught `closeBtn` reference; duplicate floating CTA; focus escapes mobile drawer (`Base.astro`) | Remove dead banner script/duplicate CTA; inert drawer and background, focus containment, skip link | Desktop and mobile keyboard testing |
| High | Unoptimised multi-megabyte service and gallery images; hero auto-rotation (`public/images`, page components) | Build-time responsive WebP derivatives preserving originals, lazy loading, explicit dimensions, motion control | Check visual quality, crop and comparisons |
| High | Missing canonical defaults/social metadata/robots/schema (`Base.astro`, config) | Consistent canonical URL, accurate local business metadata, robots, noindex utility pages | Verify generated pages and sitemap, no invented address/ratings |
| High | NDIS label leads to moving-only content (`services/specialised.astro`) | Add practical participant/carer/coordinator guidance and preselected enquiry link; retain moving advice | No registration, clinical or funding claims |
| Medium | Service tabs, gallery lightbox and comparison sliders lack accessible interactions (`services/*`, gallery, BeforeAfter) | Shared keyboard tab logic and native dialog; visible focus; preserve no-JS content | Keyboard, touch and no-JS checks |
| Medium | Conflicting deployment and inaccurate README; no test/check scripts (`.github`, package, README) | Netlify remains deployment target; CI validates site; document actual configuration and limitations | No live deployment or external account changes |
| Medium | Archived March 2026 competition still invites entries (`competition.astro`) | Preserve terms/history and URL; clearly mark closed and stop entry CTAs | Do not invent winners or change historical terms |
| Medium | Calendar returns free slots on calendar errors and misses partial overlaps (`available-slots.js`) | Validate dates, fail closed, compare interval overlaps, narrower scope | Mock provider failures and timezones |
| Low | Duplicated CSS and unused starter assets | Avoid broad cleanup; remove demonstrably unused dependencies only after checking imports | Avoid unnecessary design churn |

The baseline build passed. The initial dependency audit found 61 entries, including
6 critical. Final versions, remaining exposure and check results are recorded in
the audit report. Security headers preserve existing embeds/CMS; no speculative
restrictive CSP was added.

## Verification and boundaries

Run baseline and final unit tests, type checking, lint, production build, static
link/metadata/image checks and browser journeys at desktop/mobile sizes. Mock email
and calendar providers; do not send real messages or deploy. Document what needs
production credentials, business confirmation or field measurements. Provide commit
messages for each logical change; no credentials in artifacts or source control.

## Approved scope changes, 29 September

The user requested the original mental-wellness banner wording, removal of the
slideshow pause button and added homepage panel/sentence, automatic social feeds,
prominent Follow Us navigation, the original contact page and removal of the added
NDIS support page content. These supersede the initial content/form proposals.
The final report describes the resulting implementation; the original specialised
moving-support route is retained to preserve existing links.
