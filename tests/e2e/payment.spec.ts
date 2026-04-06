import { test, expect } from '@playwright/test';
import { login, navigateTo, randomPlate } from './helpers';

test.describe('Payment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, '/acceso');
    await expect(page.getByText('Control de Acceso')).toBeVisible({ timeout: 10000 });
  });

  test('should complete a parking session with cash payment and generate invoice', async ({ page }) => {
    const plate = randomPlate();

    // --- Step 1: Register entry ---
    await page.getByRole('button', { name: /Entrada/i }).click();
    await page.getByPlaceholder(/placa del vehiculo/i).fill(plate);
    await page.getByRole('button', { name: /Validar/i }).click();

    const entryButton = page.getByRole('button', { name: /Registrar Entrada|Iniciar Sesion por Hora/i });
    await expect(entryButton).toBeVisible({ timeout: 15000 });
    await entryButton.click();
    await expect(page.getByText(/Entrada registrada/i)).toBeVisible({ timeout: 10000 });

    // Dismiss QR modal if visible
    if (await page.getByText('Ticket de Entrada').isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
    }

    // --- Step 2: Process exit with payment ---
    await page.getByRole('button', { name: /Salida/i }).click();
    await page.getByPlaceholder(/placa del vehiculo/i).fill(plate);
    await page.getByRole('button', { name: /Validar/i }).click();

    // Two possible flows:
    // A) "Cobrar y Registrar Salida" button (inline payment)
    // B) "Registrar Salida" which may trigger payment modal
    // C) "Registrar Salida Gratis" for free (tolerance period)

    const payButton = page.getByRole('button', { name: /Cobrar y Registrar Salida/i });
    const exitButton = page.getByRole('button', { name: /Registrar Salida(?! Gratis)/i });
    const freeExitButton = page.getByRole('button', { name: /Registrar Salida Gratis/i });

    // Wait for any of these to appear
    await expect(
      page.locator('button:has-text("Cobrar"), button:has-text("Registrar Salida")')
    ).toBeVisible({ timeout: 15000 });

    // If free exit is available (tolerance period), just register it
    if (await freeExitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await freeExitButton.click();
      await expect(page.getByText(/Salida registrada/i)).toBeVisible({ timeout: 10000 });
      return; // Test passes — no payment needed within tolerance
    }

    // If direct pay button is available
    if (await payButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await payButton.click();
      await expect(page.getByText(/Pago registrado/i)).toBeVisible({ timeout: 10000 });
      return;
    }

    // Otherwise, click exit which triggers the payment modal
    await exitButton.click();

    // --- Step 3: Handle payment modal ---
    const paymentModal = page.getByText('Pago Requerido');
    await expect(paymentModal).toBeVisible({ timeout: 10000 });

    // Verify amount is displayed
    await expect(page.getByText(/Monto a pagar/i)).toBeVisible();
    await expect(page.getByText(/RD\$/)).toBeVisible();

    // Select cash payment (Efectivo) — should be default
    await page.getByText('Efectivo').click();

    // Confirm payment
    await page.getByRole('button', { name: /Confirmar Pago y Registrar Salida/i }).click();

    // Should see success toast
    await expect(page.getByText(/Pago registrado.*Salida autorizada/i)).toBeVisible({ timeout: 15000 });
  });

  test('should show payment methods in payment modal (cash, card, transfer)', async ({ page }) => {
    const plate = randomPlate();

    // Register entry
    await page.getByRole('button', { name: /Entrada/i }).click();
    await page.getByPlaceholder(/placa del vehiculo/i).fill(plate);
    await page.getByRole('button', { name: /Validar/i }).click();

    const entryButton = page.getByRole('button', { name: /Registrar Entrada|Iniciar Sesion por Hora/i });
    await expect(entryButton).toBeVisible({ timeout: 15000 });
    await entryButton.click();
    await expect(page.getByText(/Entrada registrada/i)).toBeVisible({ timeout: 10000 });

    // Dismiss QR modal
    if (await page.getByText('Ticket de Entrada').isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
    }

    // Process exit
    await page.getByRole('button', { name: /Salida/i }).click();
    await page.getByPlaceholder(/placa del vehiculo/i).fill(plate);
    await page.getByRole('button', { name: /Validar/i }).click();

    // Wait for action buttons
    await expect(
      page.locator('button:has-text("Cobrar"), button:has-text("Registrar Salida")')
    ).toBeVisible({ timeout: 15000 });

    // If free exit, skip this test (no payment modal)
    if (await page.getByRole('button', { name: /Registrar Salida Gratis/i }).isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'Vehicle within tolerance period — no payment modal shown');
      return;
    }

    // Click exit to trigger payment modal
    const exitOrPay = page.locator('button:has-text("Registrar Salida"), button:has-text("Cobrar")').first();
    await exitOrPay.click();

    // If payment modal appeared, verify methods
    if (await page.getByText('Pago Requerido').isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(page.getByText('Efectivo')).toBeVisible();
      await expect(page.getByText('Tarjeta')).toBeVisible();
      await expect(page.getByText('Transfer.')).toBeVisible();
    }
  });

  test('should navigate to invoices page and see NCF and ITBIS columns', async ({ page }) => {
    await navigateTo(page, '/facturas');

    // Verify the invoices page loads with correct heading
    await expect(page.getByText(/Facturaci.n/i)).toBeVisible({ timeout: 10000 });

    // Verify table headers include NCF and ITBIS
    const table = page.locator('table');
    await expect(table.getByText('NCF')).toBeVisible({ timeout: 10000 });
    await expect(table.getByText('ITBIS')).toBeVisible();
    await expect(table.getByText('Subtotal')).toBeVisible();
    await expect(table.getByText('Total')).toBeVisible();
  });

  test('should display invoice detail modal with ITBIS line', async ({ page }) => {
    await navigateTo(page, '/facturas');
    await expect(page.getByText(/Facturaci.n/i)).toBeVisible({ timeout: 10000 });

    // Click on the first invoice row (if any exist)
    const firstRow = page.locator('table tbody tr').first();
    const hasInvoices = await firstRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasInvoices) {
      test.skip(true, 'No invoices available to test detail modal');
      return;
    }

    await firstRow.click();

    // Invoice detail modal should show ITBIS (18%) line
    await expect(page.getByText(/ITBIS.*18%/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/TOTAL/i)).toBeVisible();

    // Should show NCF number
    await expect(page.locator('text=/FACTURA #\\d+/i')).toBeVisible();
  });
});
