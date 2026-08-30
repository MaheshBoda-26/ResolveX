import { test, expect } from '@playwright/test';

test.describe('OperationsDashboardPage Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Time range select dropdown - select each option', async ({ page }) => {
    const select = page.locator('select').first();
    await expect(select).toBeVisible();

    // Get all options
    const options = await select.locator('option').allTextContents();
    console.log('Available time range options:', options);

    // Select each option
    for (const option of options) {
      await select.selectOption(option);
      await page.waitForTimeout(500);
      const selectedValue = await select.inputValue();
      expect(selectedValue).toBe(option);
      console.log(`✓ Selected: ${option}`);
    }
  });

  test('Export button - verify CSV download', async ({ page }) => {
    // Set up download handling
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    const exportButton = page.locator('button:has-text("Export")').first();
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    // Wait for download
    const download = await downloadPromise;
    const fileName = download.suggestedFilename();
    console.log('Downloaded file:', fileName);

    expect(fileName).toMatch(/operations-cases-.*\.csv$/);
    console.log('✓ CSV download works');
  });

  test('"New Customer Case" link - navigate to /support', async ({ page }) => {
    const newCaseLink = page.locator('a:has-text("New Customer Case")').first();
    await expect(newCaseLink).toBeVisible();

    // Click the link
    await newCaseLink.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Check URL
    const url = page.url();
    expect(url).toContain('/support');
    console.log('✓ Navigation to /support works');
  });

  test('Filter tabs - click "All Cases", "Handoff Required", "Autonomous"', async ({ page }) => {
    // Find filter tabs
    const filterTabs = page.locator('div[class*="flex items-center gap-1"] button');
    await expect(filterTabs.first()).toBeVisible();

    const tabs = ['All Cases', 'Handoff Required', 'Autonomous'];

    for (const tabText of tabs) {
      const tab = page.locator(`button:has-text("${tabText}")`).first();
      await expect(tab).toBeVisible();
      await tab.click();
      await page.waitForTimeout(500);

      // Verify tab is active (has primary color)
      const className = await tab.getAttribute('class');
      expect(className).toContain('bg-surface');
      expect(className).toContain('text-primary');
      console.log(`✓ Filter tab "${tabText}" works`);
    }
  });

  test('Table action links - "Review" for Handoff Required cases', async ({ page }) => {
    // First, select "Handoff Required" filter
    const handoffTab = page.locator('button:has-text("Handoff Required")').first();
    await handoffTab.click();
    await page.waitForTimeout(500);

    // Find "Review" links in the table
    const reviewLinks = page.locator('a:has-text("Review")');
    const count = await reviewLinks.count();

    if (count > 0) {
      // Click first Review link
      const firstReviewLink = reviewLinks.first();
      await expect(firstReviewLink).toBeVisible();

      // Check the href
      const href = await firstReviewLink.getAttribute('href');
      expect(href).toMatch(/\/handoffs\//);
      console.log(`✓ Found ${count} "Review" links, first href: ${href}`);
    } else {
      console.log('⚠ No "Handoff Required" cases found to test Review links');
    }
  });

  test('Table action links - "View Audit" for resolved cases', async ({ page }) => {
    // First, select "Autonomous" filter
    const autonomousTab = page.locator('button:has-text("Autonomous")').first();
    await autonomousTab.click();
    await page.waitForTimeout(500);

    // Find "View Audit" links in the table
    const viewAuditLinks = page.locator('a:has-text("View Audit")');
    const count = await viewAuditLinks.count();

    if (count > 0) {
      // Click first View Audit link
      const firstViewAuditLink = viewAuditLinks.first();
      await expect(firstViewAuditLink).toBeVisible();

      // Check the href
      const href = await firstViewAuditLink.getAttribute('href');
      expect(href).toMatch(/\/cases\//);
      console.log(`✓ Found ${count} "View Audit" links, first href: ${href}`);
    } else {
      console.log('⚠ No "Autonomous" cases found to test View Audit links');
    }
  });
});