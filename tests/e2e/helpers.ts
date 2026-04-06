import { Page, expect } from '@playwright/test';

/**
 * Shared login helper — logs into ParkingPro and waits for dashboard.
 * Reuse in test.beforeEach() to avoid repetition.
 */
export async function login(page: Page) {
  await page.goto('/login');

  // Fill email
  await page.getByPlaceholder('admin@parkingpro.com').fill('vicuela@gmail.com');

  // Fill password
  await page.getByPlaceholder('••••••••').fill('salinas');

  // Submit
  await page.getByRole('button', { name: /Iniciar Sesion/i }).click();

  // Wait for redirect to dashboard (the index route)
  await page.waitForURL('**/', { timeout: 15000 });
  // Confirm we landed on an authenticated page (dashboard heading or sidebar present)
  await expect(page.locator('body')).not.toContainText('Iniciar Sesion');
}

/**
 * Navigate to a specific route after login.
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  // Wait for content to load
  await page.waitForLoadState('networkidle', { timeout: 15000 });
}

/**
 * Generate a random plate for testing (Dominican format: A000000).
 */
export function randomPlate(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const nums = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `${letter}${nums}`;
}
