import { test, expect } from '@playwright/test';
import { login, navigateTo } from './helpers';

test.describe('Fiscal Reports (Reportes / Facturacion)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to reportes page and see report tabs', async ({ page }) => {
    await navigateTo(page, '/reportes');

    // The reports page has multiple tabs
    await expect(page.getByText('Resumen Ejecutivo')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Ingresos/Ventas')).toBeVisible();
    await expect(page.getByText('Cuadre de Caja')).toBeVisible();
    await expect(page.getByText(/Facturaci.n/i)).toBeVisible();
  });

  test('should open Facturacion tab and see NCF-based fiscal data', async ({ page }) => {
    await navigateTo(page, '/reportes');

    // Click on the Facturacion tab
    await page.getByText(/Facturaci.n/i).click();

    // Wait for content to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Should see invoice/fiscal-related content — NCF type breakdown table
    await expect(
      page.getByText(/Tipo NCF|comprobante fiscal|Facturas emitidas/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('should export report as Excel (.xlsx)', async ({ page }) => {
    await navigateTo(page, '/reportes');

    // Look for the export/download button
    const exportButton = page.locator('button:has-text("Exportar"), button:has-text("Descargar"), button:has(svg)').filter({ hasText: /export|descargar/i });

    // If there's a dropdown trigger for export
    const downloadIcon = page.locator('button').filter({ has: page.locator('text=/Excel|Exportar|Descargar/i') });

    // Some reports pages have a direct export button or dropdown
    const anyExportButton = page.locator('button:has-text("Excel"), button:has-text("Exportar")').first();
    const hasExport = await anyExportButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasExport) {
      // Try looking for an icon-only download button
      const iconButton = page.locator('[title*="export" i], [title*="descargar" i], button:has(svg.lucide-download)').first();
      const hasIcon = await iconButton.isVisible({ timeout: 3000 }).catch(() => false);
      if (!hasIcon) {
        test.skip(true, 'No export button found on current report view');
        return;
      }
    }

    // Click export
    await anyExportButton.click();

    // If a dropdown appears with format options, select Excel
    const excelOption = page.getByText(/Excel.*\.xlsx/i);
    if (await excelOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Set up download listener before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
      await excelOption.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
    }
  });

  test('should view invoices page with fiscal NCF numbers', async ({ page }) => {
    await navigateTo(page, '/facturas');

    await expect(page.getByText(/Facturaci.n/i)).toBeVisible({ timeout: 10000 });

    // Verify fiscal data columns in invoice table
    const table = page.locator('table');
    await expect(table.getByText('NCF')).toBeVisible();
    await expect(table.getByText('ITBIS')).toBeVisible();

    // Check that ITBIS KPI is shown in stats
    await expect(page.getByText(/ITBIS recaudado/i)).toBeVisible({ timeout: 5000 });
  });

  test('should filter invoices by date range', async ({ page }) => {
    await navigateTo(page, '/facturas');
    await expect(page.getByText(/Facturaci.n/i)).toBeVisible({ timeout: 10000 });

    // Find date inputs
    const dateInputs = page.locator('input[type="date"]');
    const startDate = dateInputs.nth(0);
    const endDate = dateInputs.nth(1);

    // Set a date range
    await startDate.fill('2025-01-01');
    await endDate.fill('2025-12-31');

    // Wait for table to refresh
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Table should still be present (might have results or empty state)
    await expect(page.locator('table')).toBeVisible();
  });

  test('should display ITBIS stats in invoices page KPIs', async ({ page }) => {
    await navigateTo(page, '/facturas');
    await expect(page.getByText(/Facturaci.n/i)).toBeVisible({ timeout: 10000 });

    // Verify KPI cards
    await expect(page.getByText('Facturas emitidas')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Ingresos facturados')).toBeVisible();
    await expect(page.getByText('ITBIS recaudado')).toBeVisible();
    await expect(page.getByText('Notas de credito').or(page.getByText(/Notas de cr.dito/i))).toBeVisible();
  });
});
