/**
 * Playwright Configuration for RT Tutor: Brain-Rocket Edition (Channel 2)
 * Run with: npx playwright test
 */
export default {
  testDir: './scripts',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry'
  },
  webServer: {
    command: 'node --experimental-strip-types server/mcp_transponder.ts',
    port: 3001,
    reuseExistingServer: true
  }
};

