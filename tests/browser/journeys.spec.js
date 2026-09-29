import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const routes = ['/', '/services', '/services/space-efficiency', '/services/specialised', '/services/technical-approach', '/services/fitstyle', '/services/goal-setting', '/about', '/4c-steps-approach', '/gallery', '/contact', '/follow-us', '/competition'];
test.beforeEach(async ({ page }) => {
  // External providers are not part of local checks; never submit to a live service.
  await page.route(/https:\/\//, route => route.abort());
});
test('all public pages have usable layouts, metadata, links and accessible content', async ({ page }) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of routes) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://homeorg.com.au${path}`);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBeTruthy();
    const broken = await page.locator('img').evaluateAll(images => images.filter(image => image.complete && image.naturalWidth === 0).map(image => image.src));
    expect(broken, path).toEqual([]);
    const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
    for (const json of schema) expect(JSON.parse(json)['@type']).toBe('LocalBusiness');
    // Measure text after the service panel's entrance fade has finished.
    await page.locator('.tab-panel.is-active').evaluateAll(panels => Promise.all(
      panels.flatMap(panel => panel.getAnimations()).map(animation => animation.finished)
    ));
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect.soft(scan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), path).toEqual([]);
  }
  expect(errors).toEqual([]);
});
async function fillContact(page) {
  await page.getByLabel('Name', { exact: true }).fill('Test Visitor');
  await page.getByLabel('Email', { exact: true }).fill('visitor@example.com');
  await page.getByLabel('Phone', { exact: true }).fill('0412345678');
  await page.getByLabel('Address', { exact: true }).fill('12 Example Street, Shepparton');
  await page.getByLabel('Preferred method of contact').selectOption('Email');
  await page.getByLabel('How did you find us?').selectOption('Website');
  await page.locator('#booking-date').fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
}
test('general customer moves from service to enquiry with validation, failure and retry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'See services', exact: true }).click();
  await page.getByRole('link', { name: 'Explore Space Efficiency', exact: true }).click();
  await page.getByRole('link', { name: 'Book your decluttering session' }).click();
  await page.getByRole('button', { name: 'Book consultation' }).click();
  expect(await page.locator('input[name="name"]').evaluate(input => input.validity.valueMissing)).toBeTruthy();
  await fillContact(page);
  await page.getByLabel('Phone', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Book consultation' }).click();
  expect(await page.locator('input[name="phone"]').evaluate(input => input.validity.valueMissing)).toBeTruthy();
  await page.getByLabel('Phone', { exact: true }).fill('0412345678');
  let count = 0;
  await page.route('**/.netlify/functions/send-email', route => {
    count++;
    return route.fulfill({ status: count === 1 ? 500 : 200, contentType: 'application/json', body: JSON.stringify({ success: count > 1 }) });
  });
  await page.getByRole('button', { name: 'Book consultation' }).click();
  await expect(page.locator('#enquiry-status')).toContainText("couldn't confirm");
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Test Visitor');
  await page.getByRole('button', { name: 'Book consultation' }).click();
  await expect(page.locator('#enquiry-status')).toContainText('Thanks!');
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('');
  expect(count).toBe(2);
});
test('original contact page retains service choices and reports a failed acknowledgement', async ({ page }) => {
  await page.goto('/services/specialised');
  await expect(page.getByRole('link', { name: 'NDIS referral / enquiry' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Book moving support' }).click();
  await fillContact(page);
  await page.getByRole('button', { name: 'Moving Houses & Setting Up' }).click();
  await expect(page.getByRole('button', { name: 'Moving Houses & Setting Up' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Not sure yet' })).toHaveAttribute('aria-pressed', 'false');
  await page.route('**/.netlify/functions/send-email', route => {
    const body = route.request().postDataJSON();
    expect(body.services).toBe('Moving Houses & Setting Up');
    expect(body.address).toBe('12 Example Street, Shepparton');
    expect(body.referral_source).toBe('Website');
    return route.fulfill({ json: { success: true, acknowledgementSent: false } });
  });
  await page.getByRole('button', { name: 'Book consultation' }).click();
  await expect(page.locator('#enquiry-status')).toContainText("You don't need to submit it again");
  await expect(page.getByRole('button', { name: 'Not sure yet' })).toHaveAttribute('aria-pressed', 'true');
});
test('gallery supports keyboard comparisons, modal focus and the contact journey', async ({ page }) => {
  await page.goto('/gallery');
  const range = page.getByRole('slider').first();
  await range.focus(); const before = await range.inputValue(); await page.keyboard.press('ArrowRight');
  expect(Number(await range.inputValue())).toBeGreaterThan(Number(before));
  const photo = page.locator('.gallery-photo').first(); await photo.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('ArrowRight'); await expect(page.locator('#gallery-status')).toHaveText('3 of 23');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(photo).toBeFocused();
  await page.getByRole('link', { name: 'Be the next transformation - book your session' }).click();
  await expect(page).toHaveURL(/\/contact/);
});
test('service tabs and mobile navigation preserve keyboard focus', async ({ page }, testInfo) => {
  await page.goto('/services/space-efficiency');
  await page.getByRole('tab', { name: 'Living Room' }).focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Bedroom' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(page.locator('#mobile-nav a').last()).toBeFocused();
    await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused();
    await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  }
});

test('internal links, images, sitemap, robots and 404 resolve in the production build', async ({ page, request }) => {
  test.setTimeout(120000);
  const links = new Set(['/robots.txt', '/sitemap-index.xml', '/sitemap-0.xml']);
  for (const path of routes) {
    await page.goto(path);
    const targets = await page.locator('a[href], img[src], script[src], link[rel="stylesheet"]').evaluateAll(elements => elements.map(element => element.href || element.src).filter(Boolean));
    for (const target of targets) {
      const url = new URL(target);
      if (url.origin !== 'http://127.0.0.1:4322') continue;
      links.add(url.pathname);
      if (url.hash && url.pathname === new URL(page.url()).pathname) expect(await page.locator(`[id="${decodeURIComponent(url.hash.slice(1))}"]`).count()).toBeGreaterThan(0);
    }
  }
  for (const url of links) expect((await request.get(url)).ok(), url).toBeTruthy();
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap).toContain('https://homeorg.com.au/services/specialised');
  expect(sitemap).not.toContain('/competition');
  const missing = await page.goto('/this-page-does-not-exist');
  expect(missing.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('page not found');
});

test('requested homepage content, automatic feeds and Follow Us sign-up remain available', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Professional organising and decluttering for mental wellness');
  await expect(page.getByRole('button', { name: /slideshow/i })).toHaveCount(0);
  await expect(page.getByText('Reclaim space, one step at a time')).toHaveCount(0);
  await expect(page.getByText('From one cupboard to a whole-home reset', { exact: false })).toHaveCount(0);
  await expect(page.locator('iframe[title="HomeOrg Instagram updates"]')).toHaveAttribute('src', /lightwidget/);
  await expect(page.locator('iframe[title="Home Organisers Australia Facebook updates"]')).toHaveAttribute('src', /facebook/);
  await expect(page.locator('details.social-feed')).toHaveCount(0);
  const initialSlide = await page.locator('.carousel .slide.active img').getAttribute('src');
  await page.waitForTimeout(5200);
  await expect(page.locator('.carousel .slide.active img')).toHaveAttribute('src', initialSlide);
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.locator('#mobile-nav').getByRole('link', { name: 'Follow Us', exact: true }).click();
  } else await page.locator('.nav-desktop').getByRole('link', { name: 'Follow Us', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Test Visitor');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('visitor@example.com');
  await page.getByRole('button', { name: 'Keep me updated' }).click();
  expect(await page.locator('input[name="consent"]').evaluate(input => input.validity.valueMissing)).toBeTruthy();
  await page.getByRole('checkbox').check();
  await page.route('**/.netlify/functions/send-email', route => route.fulfill({ json: { success: true } }));
  await page.getByRole('button', { name: 'Keep me updated' }).click();
  await expect(page.locator('#follow-us-status')).toContainText('Thank you');
});

test('tablet layouts and no-JavaScript fallbacks preserve essential content', async ({ page, browser }, testInfo) => {
  if (testInfo.project.name === 'desktop') {
    for (const width of [768, 1024]) {
      await page.setViewportSize({ width, height: 1024 });
      for (const path of ['/', '/services', '/services/specialised', '/gallery', '/contact']) {
        await page.goto(path);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: ${path}`).toBeTruthy();
        await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
      }
    }
  }
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: testInfo.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 800 } });
  await context.route(/https:\/\//, route => route.abort());
  const fallback = await context.newPage();
  await fallback.goto('http://127.0.0.1:4322/services/space-efficiency');
  for (const panel of await fallback.locator('.tab-panel').all()) await expect(panel).toBeVisible();
  await expect(fallback.locator('.nav-desktop').getByRole('link', { name: 'Contact us' })).toBeVisible();
  expect(await fallback.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await fallback.goto('http://127.0.0.1:4322/contact');
  await expect(fallback.getByRole('button', { name: 'Book consultation' })).toBeDisabled();
  await expect(fallback.locator('form noscript')).toBeVisible();
  expect(await fallback.locator('form noscript').textContent()).toContain('Please enable JavaScript');
  await context.close();
});
