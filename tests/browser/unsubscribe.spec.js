import { test, expect } from '@playwright/test';

test('unsubscribe requests a confirmation link and preserves email on failure', async ({ page }) => {
  let attempts = 0;
  await page.route('**/.netlify/functions/unsubscribe', route => {
    expect(route.request().postDataJSON().email).toBe('guest@example.com');
    attempts++;
    return route.fulfill({ status: attempts === 1 ? 503 : 200, contentType: 'application/json',
      body: JSON.stringify(attempts === 1 ? { error: 'Please try again.' } : { success: true }) });
  });
  await page.goto('/follow-us/');
  const form = page.locator('#unsubscribe-form');
  await form.getByLabel('Email address').fill('guest@example.com');
  await form.getByRole('button', { name: 'Unsubscribe', exact: true }).click();
  await expect(page.locator('#unsubscribe-status')).toContainText('Please try again.');
  await expect(form.getByLabel('Email address')).toHaveValue('guest@example.com');
  await form.getByRole('button', { name: 'Unsubscribe', exact: true }).click();
  await expect(page.locator('#unsubscribe-status')).toContainText('Check your email');
  await expect(form.getByLabel('Email address')).toHaveValue('');
});

test('opening a confirmation link does not unsubscribe until the button is pressed', async ({ page }) => {
  let calls = 0;
  await page.route('**/.netlify/functions/unsubscribe', route => {
    calls++;
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ token: 'test-confirmation-token' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, unsubscribed: true }) });
  });
  await page.goto('/follow-us/?unsubscribe=test-confirmation-token');
  const button = page.getByRole('button', { name: 'Confirm unsubscribe' });
  await expect(button).toBeEnabled();
  expect(calls).toBe(0);
  await expect(page).toHaveURL(/\/follow-us\/$/);
  await button.click();
  await expect(page.locator('#unsubscribe-status')).toContainText('Your signup details have been removed');
  await expect(button).toBeHidden();
  expect(calls).toBe(1);
});
