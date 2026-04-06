import { test, expect } from '@playwright/test';
import { login, navigateTo } from './helpers';

test.describe('Cuadre de Caja (Cash Register)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, '/caja');
    await expect(page.getByText('Cuadre de Caja')).toBeVisible({ timeout: 10000 });
  });

  test('should display cash register page with correct heading', async ({ page }) => {
    await expect(page.getByText('Cuadre de Caja')).toBeVisible();
  });

  test('should show "Abrir Caja" button when no register is active', async ({ page }) => {
    // If no register is open, should see the empty state
    const openButton = page.getByRole('button', { name: /Abrir Caja/i });
    const closeButton = page.getByRole('button', { name: /Cerrar Caja/i });

    // One of these should be visible depending on current state
    const isOpen = await closeButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isOpen) {
      // No register open — verify empty state
      await expect(page.getByText('No hay caja abierta')).toBeVisible();
      await expect(page.getByText(/Debes abrir una caja/i)).toBeVisible();
      await expect(openButton).toBeVisible();
    }
  });

  test('should open cash register with initial balance', async ({ page }) => {
    const closeButton = page.getByRole('button', { name: /Cerrar Caja/i });
    const isAlreadyOpen = await closeButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isAlreadyOpen) {
      test.skip(true, 'Cash register already open — skipping open test');
      return;
    }

    // Click "Abrir Caja"
    await page.getByRole('button', { name: /Abrir Caja/i }).click();

    // Modal should appear
    await expect(page.getByRole('heading', { name: /Abrir Caja/i })).toBeVisible({ timeout: 5000 });

    // Fill the form
    await page.getByLabel(/Nombre de la caja/i).fill('Caja Test E2E');
    await page.getByLabel(/Fondo inicial/i).fill('5000');

    // Submit
    await page.locator('form').getByRole('button', { name: /Abrir Caja/i }).click();

    // Should see success toast
    await expect(page.getByText(/Caja abierta correctamente/i)).toBeVisible({ timeout: 10000 });

    // Should now see the register summary with fund info
    await expect(page.getByText('Fondo Inicial')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Total Ingresos')).toBeVisible();
    await expect(page.getByText('Balance Actual')).toBeVisible();
  });

  test('should display transaction summary when register is open', async ({ page }) => {
    const closeButton = page.getByRole('button', { name: /Cerrar Caja/i });
    const isOpen = await closeButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isOpen) {
      test.skip(true, 'No active register — skipping summary test');
      return;
    }

    // Verify KPI cards are visible
    await expect(page.getByText('Fondo Inicial')).toBeVisible();
    await expect(page.getByText('Total Ingresos')).toBeVisible();
    await expect(page.getByText('Total Egresos')).toBeVisible();
    await expect(page.getByText('Balance Actual')).toBeVisible();

    // Verify transactions section is visible
    await expect(page.getByText(/Movimientos del Turno/i)).toBeVisible();
  });

  test('should open close register modal with denomination counting', async ({ page }) => {
    const closeButton = page.getByRole('button', { name: /Cerrar Caja/i });
    const isOpen = await closeButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isOpen) {
      test.skip(true, 'No active register — skipping close test');
      return;
    }

    // Click close register
    await closeButton.click();

    // Modal should appear with denomination table
    await expect(page.getByText('Cierre de Caja')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Cuenta el efectivo por denominaci/i)).toBeVisible();

    // Verify denomination rows exist (RD$ 2,000 down to RD$ 1)
    await expect(page.getByText('RD$ 2,000')).toBeVisible();
    await expect(page.getByText('RD$ 1,000')).toBeVisible();
    await expect(page.getByText('RD$ 500')).toBeVisible();
    await expect(page.getByText('RD$ 100')).toBeVisible();

    // Verify reconciliation totals are displayed
    await expect(page.getByText(/Efectivo esperado en caja/i)).toBeVisible();
    await expect(page.getByText(/Efectivo contado/i)).toBeVisible();
    await expect(page.getByText(/Diferencia/i)).toBeVisible();

    // Verify confirm button
    await expect(page.getByRole('button', { name: /Confirmar Cierre/i })).toBeVisible();

    // Cancel
    await page.getByRole('button', { name: /Cancelar/i }).click();
    await expect(page.getByText('Cierre de Caja')).not.toBeVisible();
  });

  test('should close register and show reconciliation', async ({ page }) => {
    const closeButton = page.getByRole('button', { name: /Cerrar Caja/i });
    const isOpen = await closeButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!isOpen) {
      test.skip(true, 'No active register — skipping close reconciliation test');
      return;
    }

    await closeButton.click();
    await expect(page.getByText('Cierre de Caja')).toBeVisible({ timeout: 5000 });

    // Fill in some denomination counts for the reconciliation
    // Find the input in the row for RD$ 1,000 and enter a count
    const denomInputs = page.locator('table input[type="number"]');
    // Fill first denomination (RD$ 2,000) with count of 1
    await denomInputs.nth(0).fill('1');
    // Fill second denomination (RD$ 1,000) with count of 2
    await denomInputs.nth(1).fill('2');

    // Verify the counted balance updates (2000*1 + 1000*2 = 4000)
    await expect(page.getByText(/4,000|4000/)).toBeVisible();

    // Fill notes
    await page.getByPlaceholder(/Observaciones del cierre/i).fill('Cierre de prueba E2E');

    // Confirm close
    await page.getByRole('button', { name: /Confirmar Cierre/i }).click();

    // Should see success or approval-required toast
    await expect(
      page.getByText(/Caja cerrada|cierre registrado|requiere aprobaci/i)
    ).toBeVisible({ timeout: 10000 });
  });
});
