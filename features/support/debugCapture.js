const { Before, BeforeStep, AfterStep, Status } = require('@cucumber/cucumber');
const fs = require('fs');
const path = require('path');

const DEBUG_ROOT = path.join(__dirname, '..', '..', 'debug');
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const MAX_CONSOLE_LINES = 100;

function sanitizeName(name) {
  return String(name || 'senaryo')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '_')
    .slice(0, 80);
}

function sanitizeDataUris(text) {
  if (!text) return text;
  return String(text).replace(/data:[^"'\s)]{100,}/g, 'data:[gomulu-veri-kirpildi]');
}

function findGherkinStep(gherkinDocument, pickleStep) {
  try {
    const ids = new Set(pickleStep?.astNodeIds || []);
    const steps = [];
    const walk = (children) => {
      for (const child of children || []) {
        if (child.background) steps.push(...(child.background.steps || []));
        if (child.scenario) steps.push(...(child.scenario.steps || []));
        if (child.rule) walk(child.rule.children);
      }
    };
    walk(gherkinDocument?.feature?.children);
    return steps.find((s) => ids.has(s.id)) || null;
  } catch {
    return null;
  }
}

function extractError(param) {
  const raw = param?.error || param?.result?.exception || null;
  const message =
    (raw && (raw.message || raw.type)) ||
    param?.result?.message ||
    (raw ? String(raw) : 'Hata mesaji alinamadi');
  const stack = (raw && (raw.stack || raw.stackTrace)) || param?.result?.message || '';
  return { raw, message, stack };
}

function stepDefinitionFromStack(stack) {
  try {
    for (const line of String(stack || '').split('\n')) {
      const normalized = line.replace(/\\/g, '/');
      if (!normalized.includes(PROJECT_ROOT.replace(/\\/g, '/'))) continue;
      if (normalized.includes('node_modules') || normalized.includes('debugCapture.js')) continue;
      const match = normalized.match(/\(?([^()\s]+:\d+:\d+)\)?\s*$/);
      if (match) return match[1];
    }
  } catch {}
  return 'stack icinde proje dosyasi bulunamadi';
}

function durationMs(duration) {
  try {
    if (duration == null) return null;
    if (typeof duration === 'number') return Math.round(duration / 1e6);
    const seconds = Number(duration.seconds || 0);
    const nanos = Number(duration.nanos || 0);
    return Math.round(seconds * 1000 + nanos / 1e6);
  } catch {
    return null;
  }
}

function rawJson(value) {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (key, val) => {
      if (val instanceof Error) {
        const out = {};
        for (const prop of Object.getOwnPropertyNames(val)) out[prop] = val[prop];
        return out;
      }
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[circular]';
        seen.add(val);
      }
      if (typeof val === 'bigint') return String(val);
      return val;
    },
    2
  );
}

async function captureRolling(world) {
  const dbg = world._debug;
  const page = world.page;
  if (!dbg || !page || dbg.rollingBusy) return;
  dbg.rollingBusy = true;
  try {
    const url = page.url();
    const snapshot = await page.locator('body').ariaSnapshot({ timeout: 2000 });
    const screenshot = await page.screenshot({ timeout: 2000 });
    dbg.lastKnown = { url, snapshot, screenshot, at: new Date().toISOString() };
  } catch {
  } finally {
    dbg.rollingBusy = false;
  }
}

function attachListeners(world) {
  const dbg = world._debug;
  const page = world.page;
  if (!dbg || dbg.attached || !page) return;
  dbg.attached = true;
  dbg.page = page;

  const push = (line) => {
    dbg.consoleBuffer.push(sanitizeDataUris(line));
    if (dbg.consoleBuffer.length > MAX_CONSOLE_LINES * 5) {
      dbg.consoleBuffer.splice(0, dbg.consoleBuffer.length - MAX_CONSOLE_LINES * 2);
    }
  };

  page.on('console', (msg) => {
    try { push(`[${msg.type()}] ${msg.text()}`); } catch {}
  });
  page.on('pageerror', (err) => {
    try { push(`[pageerror] ${err?.message || err}`); } catch {}
  });
  page.on('requestfailed', (req) => {
    try {
      push(`[requestfailed] ${req.method()} ${req.url()} - ${req.failure()?.errorText || 'bilinmiyor'}`);
    } catch {}
  });
  page.on('load', () => { captureRolling(world).catch(() => {}); });
  page.on('framenavigated', (frame) => {
    try {
      if (frame === page.mainFrame()) captureRolling(world).catch(() => {});
    } catch {}
  });
}

Before(function () {
  this._debug = {
    attached: false,
    rollingBusy: false,
    consoleBuffer: [],
    lastKnown: null,
    currentStep: null,
    page: null,
  };
});

BeforeStep(function ({ pickleStep, gherkinDocument }) {
  try {
    attachListeners(this);
    const gherkinStep = findGherkinStep(gherkinDocument, pickleStep);
    this._debug.currentStep = {
      text: pickleStep?.text || 'bilinmiyor',
      keyword: (gherkinStep?.keyword || '').trim(),
      line: gherkinStep?.location?.line ?? null,
    };
  } catch {}
});

AfterStep(async function (param) {
  try {
    if (param?.result?.status !== Status.FAILED) return;

    const dbg = this._debug || {};
    const { pickle, gherkinDocument } = param;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const worker = process.env.CUCUMBER_WORKER_ID;
    const workerPart = worker !== undefined ? `w${worker}-` : '';
    const dir = path.join(DEBUG_ROOT, `${sanitizeName(pickle?.name)}-${workerPart}${timestamp}`);
    fs.mkdirSync(dir, { recursive: true });

    const { raw, message, stack } = extractError(param);
    const step = dbg.currentStep || {};
    const ms = durationMs(param?.result?.duration);

    let url = null;
    try { url = this.page?.url(); } catch {}
    if (!url && dbg.lastKnown) url = `${dbg.lastKnown.url} (rolling fallback, ${dbg.lastKnown.at})`;
    try { fs.writeFileSync(path.join(dir, 'url.txt'), `${url || 'bilinmiyor'}\n`); } catch {}

    try {
      const lines = [
        `Feature   : ${gherkinDocument?.feature?.name || 'bilinmiyor'}`,
        `Dosya     : ${gherkinDocument?.uri || pickle?.uri || 'bilinmiyor'}`,
        `Senaryo   : ${pickle?.name || 'bilinmiyor'}`,
        `Adim      : ${step.keyword ? step.keyword + ' ' : ''}${step.text || 'bilinmiyor'}` +
          (step.line ? ` (feature satir ${step.line})` : ''),
        `Step def  : ${stepDefinitionFromStack(stack)}`,
        `Sure      : ${ms != null ? ms + ' ms' : 'bilinmiyor'}`,
        `URL       : ${url || 'bilinmiyor'}`,
        '',
        '--- Hata mesaji ---',
        message,
        '',
        '--- Stack ---',
        stack || '(stack yok)',
      ];
      fs.writeFileSync(path.join(dir, 'error.txt'), sanitizeDataUris(lines.join('\n')) + '\n');
    } catch {}

    try {
      fs.writeFileSync(
        path.join(dir, 'errors.raw.json'),
        sanitizeDataUris(rawJson({ error: raw, result: param?.result }))
      );
    } catch {}

    try {
      let snapshot = null;
      let header = '';
      try {
        snapshot = await this.page.locator('body').ariaSnapshot({ timeout: 5000 });
      } catch {
        if (dbg.lastKnown?.snapshot) {
          snapshot = dbg.lastKnown.snapshot;
          header = `# NOT: canli snapshot alinamadi; son bilinen durum (rolling fallback, ${dbg.lastKnown.at}, ${dbg.lastKnown.url})\n`;
        }
      }
      if (snapshot) {
        fs.writeFileSync(path.join(dir, 'snapshot.yaml'), header + sanitizeDataUris(snapshot) + '\n');
      } else {
        fs.writeFileSync(path.join(dir, 'snapshot.yaml'), '# snapshot alinamadi (canli sayfa yok, rolling fallback bos)\n');
      }
    } catch {}

    try {
      let wrote = false;
      try {
        const shot = await this.page.screenshot({ fullPage: true, timeout: 5000 });
        fs.writeFileSync(path.join(dir, 'screenshot.png'), shot);
        wrote = true;
      } catch {}
      if (!wrote && dbg.lastKnown?.screenshot) {
        fs.writeFileSync(path.join(dir, 'screenshot.png'), dbg.lastKnown.screenshot);
        fs.writeFileSync(
          path.join(dir, 'screenshot.info.txt'),
          `Canli screenshot alinamadi; rolling fallback kullanildi (${dbg.lastKnown.at}, ${dbg.lastKnown.url}). fullPage degildir.\n`
        );
      } else if (!wrote) {
        fs.writeFileSync(path.join(dir, 'screenshot.info.txt'), 'Screenshot alinamadi (canli sayfa yok, rolling fallback bos).\n');
      }
    } catch {}

    try {
      const buffer = dbg.consoleBuffer || [];
      const tail = buffer.slice(-MAX_CONSOLE_LINES);
      fs.writeFileSync(
        path.join(dir, 'console.txt'),
        tail.length ? tail.join('\n') + '\n' : '(console/pageerror/requestfailed kaydi yok)\n'
      );
    } catch {}
  } catch {
  }
});
