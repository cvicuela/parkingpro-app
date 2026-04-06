import { test, expect } from '@playwright/test';
import { login, navigateTo, randomPlate } from './helpers';

test.describe('Vehicle Entry & Exit (Control de Acceso)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, '/acceso');
    await expect(page.getByText('Control de Acceso')).toBeVisible({ timeout: 10000 });
  });

  test('should display entry/exit toggle buttons and plate input', async ({ page }) => {
    // Verify entry/exit mode buttons
    await expect(page.getByRole('button', { name: /Entrada/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Salida/i })).toBeVisible();

    // Verify plate input field
    await expect(page.getByPlaceholder(/placa del vehiculo/i)).toBeVisible();

    // Verify validate button
    await expect(page.getByRole('button', { name: /Validar/i })).toBeVisible();
  });

  test('should validate a plate for entry and show validation result', async ({ page }) => {
    const plate = randomPlate();

    // Ensure "Entrada" mode is selected
    await page.getByRole('button', { name: /Entrada/i }).click();

    // Type plate
    await page.getByPlaceholder(/placa del vehiculo/i).fill(plate);

    // Click validate
    await page.getByRole('button', { name: /Validar/i }).click();

    // Wait for validation response — should show either a success or info message
    // The validation result panel has CheckCircle (allowed) or XCircle (denied)
    await expect(
      page.locator('text=/Registrar Entrada|Iniciar Sesion por Hora|no tiene suscripci|no encontr/i')
    ).toBeVisible({ timeout: 15000 });
  });

  test('should register entry for a new hourly vehicle', async ({ page }) => {
    const plate = randomPlate();

    // Entry mode
    await page.getByRole('button', { name: /Entrada/i }).click();
    await page.getByPlaceholder(/placa del vehiculo/i).fill(plate);
    await page.getByRole('button', { name: /Validar/i }).click();

    // Wait for validation result with entry button
    const entryButton = page.getByRole('button', { name: /Registrar Entrada|Iniciar Sesion por Hora/i });
    await expect(entryButton).toBeVisible({ timeout: 15000 });

    // Register the entry
    await entryButton.click();

    // Should show success toast
    await expect(page.getByText(/Entrada registrada/i)).toBeVisible({ timeout: 10000 });

    // The sessions table should now contain the plate
    await expect(page.locator('table').getByText(plate)).toBeVisible({ timeout: 10000 });
  });

  test('should validate exit for an active session and show payment info', async ({ page }) => {
    // First, register an entry
    const plate = randomPlate();
    await page.getByRole('button', { name: /Entrada/i }).click();
    await page.getByPlaceholder(/placa del vehiculo/i).fill(plate);
    await page.getByRole('button', { name: /Validar/i }).click();

    const entryButton = page.getByRole('button', { name: /Registrar Entrada|Iniciar Sesion por Hora/i });
    await expect(entryButton).toBeVisible({ timeout: 15000 });
    await entryButton.click();
    await expect(page.getByText(/Entrada registrada/i)).toBeVisible({ timeout: 10000 });

    // Close any QR modal if it appears
    const closeButton = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: '' });
    if (await page.getByText('Ticket de Entrada').isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      // Or click outside the modal
      await page.locator('.fixed.inset-0').first().click({ position: { x: 10, y: 10 }, force: true });
    }

    // Now switch to exit mode
    await page.getByRole('button', { name: /Salida/i }).click();
    await page.getByPlaceholder(/placa del vehiculo/i).fill(plate);
    await page.getByRole('button', { name: /Validar/i }).click();

    // Should show exit-related action: either payment or free exit
    await expect(
      page.locator('text=/Cobrar y Registrar Salida|Registrar Salida|Salida Gratis|Pago Requerido/i')
    ).toBeVisible({ timeout: 15000 });
  });

  test('should show active sessions table with correct columns', async ({ page }) => {
    // The sessions table should have standard columns
    const table = page.locator('table');
    await expect(table.getByText('Placa')).toBeVisible();
    await expect(table.getByText('Estado')).toBeVisible();
    await expect(table.getByText('Entrada')).toBeVisible();
    await expect(table.getByText('Duracion')).toBeVisible();
    await expect(table.getByText('Monto')).toBeVisible();
  });

  test('should filter sessions by status', async ({ page }) => {
    // The status filter dropdown exists
    const filter = page.locator('select');
    await expect(filter).toBeVisible();

    // Select "Todas" to see all sessions
    await filter.selectOption('');

    // Wait for table to refresh
    await page.waitForTimeout(2500);

    // Table should still be present
    await expect(page.locator('table')).toBeVisible();
  });
});
