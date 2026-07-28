const { Before, After, BeforeAll, AfterAll, Status } = require('@cucumber/cucumber');
const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');
const config = require('../../config/env');
const { buildStorageState } = require('../../api/authApi');

const BROWSERS = { chromium, firefox, webkit };

let browser;

const TRACE_DIR = path.join(__dirname, '..', '..', 'reports', 'traces');

BeforeAll(async function () {
  const launcher = BROWSERS[config.browser];
  if (!launcher) { throw new Error(`Unknown browser: "${config.browser}". Use chromium | firefox | webkit.`); }

  browser = await launcher.launch({ headless: config.headless });
});

AfterAll(async function () {
  if (browser) await browser.close();
});

Before({ tags: '@auth' }, function () {
  if (!config.hasCredentials) {
    return 'skipped';
  }
});

Before({ tags: '@api and @auth' }, async function () {
  this.storageState = await buildStorageState(config.email, config.password);
});

Before(async function () {
  this.context = await browser.newContext({
    storageState: this.storageState,
    locale: 'tr-TR',
    viewport: { width: 1440, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });
  await this.context.tracing.start({ screenshots: true, snapshots: true });
  this.page = await this.context.newPage();
  this.initPages();
});

After(async function (testCase) {
  const failed = testCase.result?.status === Status.FAILED;
  try {
    if (failed && this.page) {
      const screenshot = await this.page.screenshot({ fullPage: false });
      this.attach(screenshot, 'image/png');
      this.attach(`Last URL: ${this.page.url()}`, 'text/plain');
    }
    if (this.context) {
      const safeName = testCase.pickle.name.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80);
      const traceName = `${safeName || 'scenario'}.zip`;
      const tracePath = path.join(TRACE_DIR, traceName);
      await this.context.tracing.stop({ path: failed ? tracePath : undefined });
      if (failed && fs.existsSync(tracePath)) {
        this.attach(fs.readFileSync(tracePath), 'application/zip');
      }
    }
  } finally {
    if (this.context) await this.context.close();
  }
});
