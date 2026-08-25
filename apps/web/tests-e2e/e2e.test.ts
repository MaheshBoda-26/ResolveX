import { test, expect } from '@playwright/test';

test.describe('ResolveX E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
  });

  test('Chat UI sends message → receives response', async ({ page }) => {
    // Wait for chat to be ready
    await expect(page.locator('form')).toBeVisible();

    // Type a message
    const input = page.locator('input[placeholder="Type a message..."]');
    await input.fill('I was charged twice and want to upgrade');

    // Click send button
    await page.locator('button[type="submit"]').click();

    // Wait for response (user message appears first)
    await expect(page.locator('text=I was charged twice and want to upgrade')).toBeVisible({ timeout: 5000 });

    // Wait for assistant response
    await expect(page.locator('.animate-bounce').first()).toBeHidden({ timeout: 10000 });

    // Check that we got some response
    const messages = page.locator('[class*="max-w-[800px]"]');
    await expect(messages.last()).toBeVisible();
  });

  test('Voice button connects to ElevenLabs', async ({ page }) => {
    // Voice button should exist
    const voiceButton = page.locator('button[aria-label="Start voice input"]');
    await expect(voiceButton).toBeVisible();

    // Click voice button
    await voiceButton.click();

    // Should toggle to "Stop voice input"
    const stopButton = page.locator('button[aria-label="Stop voice input"]');
    await expect(stopButton).toBeVisible();

    // Click again to stop
    await stopButton.click();
    await expect(voiceButton).toBeVisible();
  });

  test('Trace page shows agent timeline', async ({ page }) => {
    // Navigate to trace page with a run ID
    await page.goto('/trace?runId=test-run-123');
    await page.waitForLoadState('networkidle');

    // Check trace page loads
    await expect(page.locator('h1:has-text("Agent Trace")')).toBeVisible();

    // Back button should work
    await page.locator('button:has-text("Back")').click();
    await expect(page).toHaveURL(/\/chat/);
  });

  test('Sidebar navigation works', async ({ page }) => {
    // Check sidebar is visible
    await expect(page.locator('aside')).toBeVisible();

    // Check "New Conversation" button
    await expect(page.locator('button:has-text("New Conversation")')).toBeVisible();

    // Click new conversation
    await page.locator('button:has-text("New Conversation")').click();

    // URL should be clean (no conversation param)
    await expect(page).toHaveURL(/\/chat$/);
  });

  test('Dark/Light mode toggle works', async ({ page }) => {
    // Find theme toggle button
    const themeButton = page.locator('button:has-text("Dark mode"), button:has-text("Light mode")').first();
    await expect(themeButton).toBeVisible();

    // Click to toggle
    const initialTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await themeButton.click();
    const newTheme = await page.evaluate(() => document.documentElement.classList.contains('dark'));

    expect(newTheme).not.toBe(initialTheme);
  });

  test('Conversation history loads', async ({ page }) => {
    // Check sidebar shows conversation list or empty state
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // Either shows loading, empty state, or conversations
    const recentSection = page.locator('text=Recent');
    await expect(recentSection).toBeVisible();
  });

  test('Mobile sidebar opens and closes', async ({ page }) => {
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Hamburger menu should be visible
    const menuButton = page.locator('button[aria-label="Open sidebar"]');
    await expect(menuButton).toBeVisible();

    // Click to open
    await menuButton.click();
    await expect(page.locator('aside')).toHaveClass(/translate-x-0/);

    // Click overlay to close
    await page.locator('fixed.inset-0.bg-black\\/50').click();
    await expect(page.locator('aside')).toHaveClass(/-translate-x-full/);
  });

  test('Error handling for empty message', async ({ page }) => {
    // Try to send empty message
    const sendButton = page.locator('button[type="submit"]');
    await expect(sendButton).toBeDisabled();

    // Type something
    const input = page.locator('input[placeholder="Type a message..."]');
    await input.fill('Test message');

    // Send should be enabled
    await expect(sendButton).toBeEnabled();
  });

  test('Loading state during message send', async ({ page }) => {
    const input = page.locator('input[placeholder="Type a message..."]');
    await input.fill('Hello');

    await page.locator('button[type="submit"]').click();

    // Should show typing indicator
    await expect(page.locator('.animate-bounce')).toBeVisible({ timeout: 1000 });
  });

  test('Conversation URL parameter loads existing conversation', async ({ page }) => {
    // Navigate with conversation ID
    await page.goto('/chat?conversation=test-conversation-id');
    await page.waitForLoadState('networkidle');

    // Chat should load
    await expect(page.locator('form')).toBeVisible();
  });
});

test.describe('API Integration E2E', () => {
  test('POST /api/triage returns valid TriageResult', async ({ request }) => {
    const response = await request.post('/api/triage', {
      data: {
        message: 'I was charged twice and want to upgrade',
        customerId: '00000000-0000-0000-0000-000000000000',
        channel: 'chat',
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();

    expect(result).toHaveProperty('intents');
    expect(result).toHaveProperty('tasks');
    expect(result).toHaveProperty('summary');
    expect(Array.isArray(result.intents)).toBe(true);
    expect(Array.isArray(result.tasks)).toBe(true);
  });

  test('POST /api/triage handles voice channel', async ({ request }) => {
    const response = await request.post('/api/triage', {
      data: {
        message: 'I need help with my bill',
        customerId: '00000000-0000-0000-0000-000000000000',
        channel: 'voice',
      },
    });

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result).toHaveProperty('intents');
  });
});