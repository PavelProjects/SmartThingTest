import { defineConfig, devices } from '@playwright/test';

const projects = [
  {
    name: 'Esp8266',
    use: { 
      ...devices['Desktop Firefox'],
      baseURL: "http://192.168.1.14/",
    },
  },
  {
    name: 'Esp32',
    use: { 
      ...devices['Desktop Firefox'],
      baseURL: "http://192.168.1.13/",
    },
  },
];

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: projects.length,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // reporter: 'html',
  reporter: 'line',
  use: {
    trace: 'on-first-retry',
    testIdAttribute: 'id',
  },
  projects
});

