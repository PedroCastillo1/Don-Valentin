import { defineConfig } from "@playwright/test";

const PUERTO = 3100;
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}`,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "movil", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: "node --experimental-strip-types apps/api/src/server.ts",
    url: `http://127.0.0.1:${PUERTO}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      NODE_ENV: "test",
      PORT: String(PUERTO),
      DB_NAME: "dv_e2e",
      DB_PORT: "54330",
      DB_USER: "postgres",
      DB_PASSWORD: "postgres",
      WEB_DIST: "apps/web/dist",
      COOKIE_SECURE: "false",
      LIMITE_INGRESOS: "200",
    },
  },
});
