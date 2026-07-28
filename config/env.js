const path = require('path');
const fs = require('fs');

const APP_ENV = process.env.ENV || 'test';
const envFile = path.resolve(process.cwd(), `.env.${APP_ENV}`);

if (!fs.existsSync(envFile)) {
  console.warn(`[config] Uyari: ${envFile} bulunamadi; varsayilan degerler kullanilacak.`);
}

require('dotenv').config({ path: envFile });

const config = {
  env: APP_ENV,
  baseUrl: process.env.BASE_URL || 'https://www.e-bebek.com',
  apiBaseUrl: process.env.API_BASE_URL || 'https://api2.e-bebek.com',
  apiClientId: process.env.API_CLIENT_ID || 'trusted_client',
  apiClientSecret: process.env.API_CLIENT_SECRET || 'secret',
  email: process.env.EBEBEK_EMAIL || '',
  password: process.env.EBEBEK_PASSWORD || '',
  browser: (process.env.BROWSER || 'chromium').toLowerCase(),
  headless: (process.env.HEADLESS || 'true').toLowerCase() !== 'false',
  workers: Number(process.env.PARALLEL_WORKERS || 2),
  defaultTimeout: Number(process.env.DEFAULT_TIMEOUT_MS || 30000),
};

config.hasCredentials = Boolean(config.email && config.password);

module.exports = config;
