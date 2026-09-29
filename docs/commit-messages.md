# Commit message and change groups

The completed review is committed together because the shared layout, image
component, page changes and dependency updates depend on each other.

`fix(homeorg): harden enquiries and improve site usability`

The following messages describe the logical change groups included in the commit.
No push or deployment is included.

1. `fix(enquiries): validate submissions and preserve successful owner delivery`
   - Contact form/client, shared enquiry validation, send-email and legacy SMTP
     handler, follow-us feedback, environment example and mail regression tests.
   - Calendar date bounds, overlap detection and fail-closed error handling,
     with calendar regression tests.
2. `fix(a11y): repair navigation tabs and gallery keyboard controls`
   - Shared layout/navigation, skip link, focus containment, single CTA,
     native gallery dialog, comparison controls, service tabs, gallery/archive
     contrast, labelled map region and related CSS.
3. `fix(content): restore requested homepage contact and social presentation`
   - Original banner wording, removal of the added homepage panel and pause
     button, automatic social feeds, prominent Follow Us navigation, original
     contact fields/service buttons and original specialised/moving page content.
   - Consultation wording, supporting page descriptions and competition archive.
4. `perf(seo): optimise existing photos and complete page metadata`
   - Photo component and all image consumers, lazy-loaded social embeds,
     canonicals/social metadata/business schema, sitemap and robots configuration.
5. `chore(quality): update dependencies and add repeatable site validation`
   - Dependency lockfile, runtime configuration, lint/type/test commands,
     Playwright journeys, Netlify headers, CI, gitignore and CMS noindex metadata.
   - README, audit plan/report and these commit messages.

## Follow-up: button and sign-up labels

Commit message: `fix(ui): brighten buttons and update contact and signup labels`

- Rename shared quote buttons to Contact us and the homepage banner action to
  Book your free consultation.
- Restore bright brand teal buttons with readable dark labels and a lighter hover.
- Keep service-page hover colours consistent and let entrance animations finish
  before the existing accessibility scan measures text contrast.
- Mark Follow Us name/email with an asterisk and label the optional phone field
  simply Phone; keep native validation unchanged and update existing test selectors.
