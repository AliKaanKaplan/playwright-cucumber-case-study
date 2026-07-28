const { request } = require('playwright');
const config = require('../config/env');

const TOKEN_PATH = '/authorizationserver/oauth/token';
const CAPTCHA_TOKEN = 'null';

const SPARTACUS_AUTH_KEY = 'spartacus⚿⚿auth';

async function apiLogin(email, password) {
  const ctx = await request.newContext();
  try {
    const resp = await ctx.post(config.apiBaseUrl + TOKEN_PATH, {
      form: {
        client_id: config.apiClientId,
        client_secret: config.apiClientSecret,
        grant_type: 'password',
        username: email,
        password,
        captcha_token: CAPTCHA_TOKEN,
      },
    });
    if (!resp.ok()) {
      const body = await resp.text();
      throw new Error(`API login failed (${resp.status()}): ${body.slice(0, 200)}`);
    }
    return await resp.json();
  } finally {
    await ctx.dispose();
  }
}

function buildAuthState(token) {
  return {
    token: {
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      scope: token.scope,
      token_type: token.token_type,
      expires_in: token.expires_in,
    },
    userId: 'current',
    redirectUrl: '',
  };
}

async function buildStorageState(email, password) {
  const token = await apiLogin(email, password);
  return {
    cookies: [],
    origins: [
      {
        origin: new URL(config.baseUrl).origin,
        localStorage: [{ name: SPARTACUS_AUTH_KEY, value: JSON.stringify(buildAuthState(token)) }],
      },
    ],
  };
}

module.exports = { buildStorageState };
