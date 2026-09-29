# HomeOrg audit and improvement report

Reviewed 28-29 September 2026. This is the first independent review; there was no
earlier Astra report to verify. Changes are local and have not been deployed.
The [prioritised plan](audit-plan.md) records affected files, proposed solutions,
benefits and regression risks before the main implementation.

## What was found

| Area | Confirmed problem | Impact |
| --- | --- | --- |
| Enquiries | Full address, phone, referral source and date were unnecessarily required; copy promised an appointment/calendar invite that the backend never created | Extra effort and misleading expectations |
| Delivery | A failed visitor acknowledgement could return failure after the owner's email had already been sent | Encourages duplicate enquiries and hides successful delivery |
| Backend | Input types, lengths, dates and email recipients were insufficiently constrained; no configured public endpoint rate limits | Avoidable abuse and unreliable data |
| Navigation | Shared layout contained an undeclared-variable script error, duplicate floating CTA and a mobile drawer without focus containment | Broken behaviour, clutter and keyboard barriers |
| Accessibility | Image-only gallery controls, inaccessible modal interaction, service tabs without keyboard semantics, weak focus/contrast and duplicate H1s | Core journeys were harder to use without a mouse |
| Performance | Several service PNGs were multi-megabyte files; comparison/gallery images loaded without an effective responsive image pipeline; social embeds loaded automatically | Excess download and third-party work, especially on mobile |
| Content | NDIS navigation led to moving-only guidance; service pages had weak onward links; the expired March competition still invited entries | Visitors had difficulty understanding support and the next step |
| SEO | Shared metadata lacked complete canonical/social defaults and accurate structured data; no robots file | Inconsistent signals for local discovery and sharing |
| Calendar | Missing/provider-error free-busy results could appear available; string comparisons missed partial/offset-equivalent overlaps | Unreliable optional availability API |
| Maintenance | Duplicate inline interaction code; unused dependencies; inaccurate starter README; GitHub Pages deployment could not run Netlify forms | Higher maintenance cost and conflicting hosting assumptions |

The original installed frontend was Astro 5.16.9. The final site retains static
Astro pages, ordinary CSS and browser JavaScript. It has no React rendering,
database, public login or upload endpoint. Netlify Node functions use Google APIs,
Luxon and Nodemailer. Decap CMS/Netlify Identity configuration is present, but its
content folders are not consumed by the public pages. There is no first-party
analytics integration. No hard-coded credentials were found in the inspected
source; this was not a forensic scan of all Git history or external accounts.

## What changed and why it helps

### Clearer journeys and local content

The homepage retains the requested banner title, "Professional organising and
decluttering for mental wellness", alongside the service area and quote action.
The extra cupboard/reset sentence and added "Reclaim space, one step at a time"
panel are removed. Existing photography, reviews and service content remain.
Shared navigation includes Follow Us on desktop and mobile, the 4Cs and
before-and-after work; testimonials remain on the homepage with footer/mobile
links. Supporting pages link to related services, real results and the 4Cs.

The added NDIS page content and dedicated navigation/referral flow are removed at
the user's request. The existing `/services/specialised` URL retains its original
specialised/moving content and accessible tabs. Existing brief service-card
references and the original contact referral-source option remain. No NDIS
registration, therapeutic outcome or funding guarantee has been invented.

The competition remains at its existing URL as a clearly closed historical page;
entry links are removed and the backend rejects new competition submissions.

### More reliable enquiries with the original contact layout

The original contact layout, required fields, service-selection buttons and
30-minute consultation heading are restored at the user's request. This includes
phone, address, referral source and preferred date, rather than the proposed
shorter form. The calendar enhancement is retained with a native date fallback.
Submission copy accurately describes a request rather than promising an instant
calendar invite. Native validation, persistent feedback, request timeouts,
duplicate-click prevention and direct phone/email alternatives support recovery.
Failed or uncertain submissions retain the visitor's details, and the service
buttons expose their selected state to assistive technology.

Both mail functions share bounded JSON validation, a honeypot, single-mailbox
validation, safe text/HTML handling and configured Netlify rate limits. SMTP has
connection timeouts and file/URL content access disabled. The owner receives the
enquiry first. A later acknowledgement failure returns a distinct successful
enquiry outcome so the visitor is not asked to submit it again. Generic error logs
avoid recording the submitted message or provider error payload. Promotional
sign-ups still require explicit consent and notify the owner without enrolling
the address in a new external marketing system.

The legacy SMTP endpoint remains available and accepts legacy addresses. It sends
an enquiry rather than reserving a calendar slot. Calendar requests validate dates,
use read-only access and reject uncertain availability; overlap calculations use
actual timestamps. The unused Google helper is outside the deployed function
directory.

### Accessible, responsive presentation

The shared layout has a skip link, visible focus states, clearer active navigation
and one floating quote action. The mobile drawer contains focus, closes with
Escape and restores focus. Shared tabs support arrows, Home and End; service
content remains readable with JavaScript disabled. Gallery photos are links with
a native modal dialog, labelled controls, arrow-key navigation and Escape/focus
restoration. Comparison sliders use native keyboard controls and visible focus.
The hero respects reduced-motion preferences and pauses when hidden or focused.
Its visible pause button is removed as requested. Without a visitor-operated pause
control, do not claim that the automatically rotating banner meets every motion
accessibility requirement.

Button/link contrast and link distinction were corrected while retaining the
turquoise/peach brand. Responsive spacing, readable overlays, mobile CTAs and
keyboard-focusable horizontal service lists address concrete usability problems.
These checks improve accessibility; they are not a claim of complete WCAG
conformance or a substitute for assistive-technology testing with users.

### Images, SEO and deployment

`Photo.astro` generates responsive WebP derivatives of existing JPG/PNG assets with
intrinsic dimensions. Most photos are lazy loaded; the first hero image is eager
and prioritised. Original files and URLs remain available, including full-size
gallery views. Facebook and Instagram timelines are automatically displayed, as
requested, with browser lazy loading. The gallery video loads when selected.
Google Fonts, the calendar enhancement and social providers remain external;
their availability and third-party resource cost are not controlled by this site.

For the five service-card source images, the generated fallback WebP files total
196,438 bytes versus 13,082,902 bytes for the original PNGs: about **98.5% smaller**.
This is a file-size comparison, not a measured page-load or Core Web Vitals score;
the browser chooses responsive variants and full-size gallery originals remain.

Pages have consistent titles, descriptions, canonicals, social metadata and an
accurate LocalBusiness record using existing public contact details and service
areas. No street address, review score or opening hours have been invented.
Headings and internal links were improved. Robots and sitemap configuration
exclude the closed competition from indexing; the 404 and CMS admin are noindex.
This establishes SEO fundamentals without promising rankings or Google rich
results, and without creating thin location pages.

Netlify remains the full website/function deployment target. GitHub Actions now
checks lint, types, tests, build and browser journeys instead of publishing a
functionless GitHub Pages copy. Security headers and immutable generated-asset
caching are configured. The README and environment example explain the actual
architecture and server-only credentials.

## Dependencies and remaining security work

The initial npm audit reported 61 entries: 6 critical, 36 high, 17 moderate and
2 low. Unused packages were removed and relevant runtime/development dependencies
updated. The final framework is Astro 6.4.8 with Nodemailer 10.0.12. Rollup uses its
official WebAssembly package for compatibility with this managed Windows device;
Sharp 0.35.4 and esbuild 0.28.1 are pinned through explicit overrides.

The final Nodemailer update addresses the newly reported shared DNS/TLS cache
advisory. Its Node 20+ requirement fits the project's Node 22/24 setup; the
application still uses the documented transport API. See the
[Nodemailer changelog](https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md)
and [security advisory](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-6vj9-mwq6-2f5v).

Astro 7.3.5 was evaluated after reviewing its migration changes, but the native
compiler was blocked by Windows Application Control, and its portable alternative
could not resolve Windows project paths reliably. That upgrade was not retained.
The application remains static Astro; no new frontend framework was introduced.

The final npm audit still reports **one critical Astro package entry**, covering
several advisories. Do not describe this repository as vulnerability-free. The
critical AVIF issue is in the image dependency, which has been upgraded to the
required Sharp 0.35.4. This site processes trusted local JPG/PNG files at build time
and does not expose a runtime image processing or upload endpoint. This reduces
exposure; it does not erase the framework's advisory entry. The
[Astro security advisory](https://github.com/withastro/astro/security/advisories/GHSA-26w7-cxv4-gfx2)
explains the untrusted-AVIF condition and patched Sharp version.

Other remaining Astro advisories concern untrusted spread attribute names, view
transition values and server base-path handling. Inspection found no user-controlled
template attributes, hydrated islands/view transitions or Astro server/auth routes
in this static site. Complete the Astro 7 upgrade on a supported development/build
environment and retest before adding these features. Keep the local development
server private, and reassess exposure if content starts coming from untrusted users.

## What deliberately remains unchanged

- Existing public routes, source photos, testimonials, biographies, memberships,
  service detail content, 4Cs and "Reclaiming Stolen Space" branding are preserved.
  Existing business claims have not been independently authenticated.
- No database, queue, CRM, payment flow, real-time booking or upload system was
  added. These require operational decisions beyond the existing enquiry service.
- The CMS remains present but unwired. Silently switching source-of-truth content
  or authentication would risk business editing workflows.
- Broad CSS/starter-file cleanup was deferred. Shared behaviour was extracted
  where it fixed duplication; unrelated code was not rewritten for style alone.
- The original full contact form and moving-support page remain by request; no
  dedicated NDIS landing content or referral form is included.
- No fabricated case studies, project categories, ratings, credentials, NDIS
  status, service pricing or location landing pages were added.
- No analytics, CAPTCHA vendor, restrictive CSP, mailing-list provider or
  credential/account changes were introduced without an operational need.

## Business improvements

| Outcome | Result and practical limit |
| --- | --- |
| Enquiries | Persistent feedback and separate acknowledgement handling reduce confusing retries; the original form length remains by request |
| Trust | Booking language matches the actual service, contact details are easy to find, and existing genuine business content is preserved |
| Ease of use | Follow Us is in both menus; accessible navigation, service tabs and gallery controls support more visitors |
| NDIS enquiries | Added NDIS landing/referral content is removed by request; the existing service references and referral-source option remain |
| Mobile | Tested layouts and contact controls fit mobile/tablet widths; responsive image derivatives reduce downloads |
| Local search | Consistent canonicals, service-area metadata, sitemap and business schema establish useful fundamentals; rankings are not measured |

## Validation

Final results, 29 September 2026:

| Check | Result |
| --- | --- |
| Dependency installation | Clean `npm ci` succeeded during the framework verification; the subsequent Nodemailer patch installed and passed the checks below |
| `npm run lint` | Passed |
| `npm test` | 16 passed, including mail validation/delivery outcomes, sign-up consent/retry and calendar failures/overlaps |
| `npm run check` | 39 files; 0 errors, 0 warnings, 0 hints |
| `npm run build` | Passed; 14 pages and 137 responsive image derivatives |
| `npm run test:e2e` | All 16 scenarios passed across desktop and mobile; includes 768px/1024px tablet checks and JavaScript-disabled fallbacks |
| Accessibility automation | No detected WCAG 2 A/AA or 2.1 AA axe violations on the 13 scanned public pages at the tested desktop/mobile sizes; not a full conformance assessment |
| Browser journeys | General service to enquiry, original contact service chips, failure/retry, acknowledgement failure, gallery to contact, navigation focus, reduced motion and Follow Us consent |
| Generated output | Internal links, local image/script/style URLs, H1s, canonical/description metadata, JSON-LD, sitemap, robots and 404 checked |
| Function packaging | All three functions bundled with esbuild, imported and returned the expected method rejection without provider calls |
| Library smoke checks | Nodemailer 10 generated a message in memory; Sharp successfully performed a fresh local WebP conversion |
| Visual inspection | Desktop/mobile homepage and mobile contact/gallery screenshots reviewed; artifacts are in local `.audit/screenshots/` |
| External display check | Flatpickr initialised; Facebook and Instagram frames returned HTTP 200 and displayed provider content automatically |
| `npm audit` | One remaining critical Astro package entry, assessed above; no remaining Nodemailer entry |
| `git diff --check` | Passed |

Automated browser scenarios block external providers and mock enquiry responses.
The separate external display check only loaded the calendar/social embeds; no
real enquiry, email, sign-up or calendar modification was sent. Netlify's live
delivery, rate-limit enforcement, production redirects/headers and real field
Core Web Vitals remain unverified. Safari and Firefox were not tested; mobile
tests use Chromium emulation. The local dev server is available at
`http://127.0.0.1:4321/`.

## Remaining recommendations

1. **Before deploying:** verify Netlify is connected to the intended repository and
   branch, then test a controlled enquiry with the business's permission. Confirm
   owner inbox delivery, visitor acknowledgement, spam placement and correct
   OAuth variables. Check deployed redirects, headers and 404 behaviour.
2. **Verify rate-limit activation:** inspect Netlify's post-processing deploy logs
   for each function rule. Local preview cannot demonstrate host enforcement.
   See [Netlify's rate-limit documentation](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/).
   A CAPTCHA or durable shared abuse control may be useful if spam persists.
3. **Finish framework patching:** resolve the documented Astro 7 environment
   compatibility issue and repeat the build/journeys. Do not accept a broken
   development build just to make the audit count zero.
4. **Clarify content ownership:** choose source-controlled pages or a deliberately
   integrated CMS; review admin access and Identity/Git Gateway settings before
   relying on the CMS for content changes.
5. **Business review:** confirm memberships, service scope, photo/review consent,
   NDIS arrangements, consultation wording and service-area boundaries. Add a
   business-approved privacy/retention statement and operational unsubscribe
   process; the existing privacy copy is not a full privacy policy.
6. **Measure real outcomes:** verify Search Console/sitemap submission and the
   business profile, then consider privacy-appropriate enquiry conversion tracking.
   Measure field Core Web Vitals after deployment. Image byte savings and local
   browser checks do not establish real mobile network performance or rankings.
7. **Growth options:** develop consented before-and-after case studies with real
   context; add answers to actual recurring enquiries; consider a durable enquiry
   record/idempotency mechanism if delivery uncertainty becomes an operational
   problem. SMTP acceptance alone does not prove inbox delivery, and a timeout
   after acceptance can still leave the visitor uncertain.

The commit message and logical change groups are in
[commit-messages.md](commit-messages.md). The user subsequently requested a local
commit of the reviewed changes. No push or deployment is included.
