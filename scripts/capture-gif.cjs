#!/usr/bin/env node
/**
 * Captures an animated GIF of the powerflow diagram using CDP screencast.
 *
 * Usage:
 *   npm run capture:gif
 *   npm run capture:gif -- --test "Solar day" --duration 4 --fps 30
 *
 * Options:
 *   --test <label>     Test case button to click (default: "2 EVs")
 *   --duration <s>     Recording duration in seconds (default: 3)
 *   --fps <n>          Output GIF framerate (default: 30)
 *   --out <path>       Output file (default: docs/preview.gif)
 *
 * Requires: puppeteer-core (devDependency), python3, ffmpeg, /usr/bin/chromium
 * Automatically builds the site and starts/stops a local HTTP server.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const get = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
};
const TEST_CASE  = get('--test',     '2 EVs');
const DURATION_S = Number(get('--duration', 3));
const OUT_FPS    = Number(get('--fps',      30));
const OUT_FILE   = path.resolve(get('--out', 'docs/preview.gif'));

const ROOT      = path.resolve(__dirname, '..');
const DIST_SITE = path.join(ROOT, 'dist-site');
const SERVE_DIR = path.join(ROOT, 'node_modules/.cache/pf-serve');
const PORT      = 8081;
const BASE      = `/power-flow-diagram/`;
const URL       = `http://localhost:${PORT}${BASE}`;
const CHROMIUM  = '/usr/bin/chromium';
const FRAMES    = path.join(ROOT, 'node_modules/.cache/pf-frames');

// ── Step 1: build site ────────────────────────────────────────────────────────
console.log('Building site…');
execSync('npm run build:site', { cwd: ROOT, stdio: 'inherit' });

// ── Step 2: set up static server at /power-flow-diagram/ ─────────────────────
fs.rmSync(SERVE_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(SERVE_DIR, 'power-flow-diagram'), { recursive: true });
execSync(`cp -r ${DIST_SITE}/. ${path.join(SERVE_DIR, 'power-flow-diagram')}/`);

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SERVE_DIR], {
  stdio: 'ignore',
  detached: false,
});
// Give the server a moment to start
execSync('sleep 0.5');

// ── Step 3: capture via CDP screencast ────────────────────────────────────────
const run = async () => {
  fs.rmSync(FRAMES, { recursive: true, force: true });
  fs.mkdirSync(FRAMES, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--force-color-profile=srgb'],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.setViewport({ width: 500, height: 500, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: 'networkidle0' });

    await page.addStyleTag({ content: `
      html, body { background: #fff !important; margin: 0; padding: 0 !important; }
      h1, p.sub { display: none !important; }
      .layout { display: block !important; }
      .card:not(.diagram-card) { display: none !important; }
      .diagram-card {
        resize: none !important;
        width: 460px !important; height: 460px !important;
        border: none !important; border-radius: 0 !important;
        padding: 16px !important; margin: 0 !important;
        background: #fff !important;
      }
      .resize-hint { display: none !important; }
    ` });

    await new Promise(r => setTimeout(r, 500));

    // Click the requested test case
    const clicked = await page.evaluate((label) => {
      const btn = [...document.querySelectorAll('#testcases button')]
        .find(b => b.textContent.trim() === label);
      if (btn) { btn.click(); return true; }
      return false;
    }, TEST_CASE);
    if (!clicked) {
      const available = await page.evaluate(() =>
        [...document.querySelectorAll('#testcases button')].map(b => b.textContent.trim())
      );
      console.error(`Test case "${TEST_CASE}" not found. Available: ${available.join(', ')}`);
      process.exit(1);
    }

    // Let dots spread out before recording
    await new Promise(r => setTimeout(r, 1500));

    // Start CDP screencast at native frame rate
    const client = await page.createCDPSession();
    const captured = [];

    client.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      captured.push({ data, ts: metadata.timestamp * 1000 });
      client.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });

    await client.send('Page.startScreencast', {
      format: 'png', quality: 90,
      maxWidth: 460, maxHeight: 460,
      everyNthFrame: 1,
    });

    process.stdout.write(`Recording "${TEST_CASE}" for ${DURATION_S}s…`);
    await new Promise(r => setTimeout(r, DURATION_S * 1000));
    await client.send('Page.stopScreencast');
    console.log(` ${captured.length} frames (${(captured.length / DURATION_S).toFixed(0)} fps)`);

    // Save frames
    const t0 = captured[0].ts;
    captured.forEach(f => { f.ts -= t0; });
    for (let i = 0; i < captured.length; i++) {
      fs.writeFileSync(
        path.join(FRAMES, `frame-${String(i).padStart(4, '0')}.png`),
        Buffer.from(captured[i].data, 'base64')
      );
    }

    // ffconcat with real per-frame durations → correct playback speed
    const avgDur = captured.length > 1
      ? (captured[captured.length - 1].ts - captured[0].ts) / (captured.length - 1)
      : 1000 / 60;
    const lines = ['ffconcat version 1.0'];
    for (let i = 0; i < captured.length; i++) {
      const durMs = i < captured.length - 1
        ? captured[i + 1].ts - captured[i].ts : avgDur;
      lines.push(`file '${FRAMES}/frame-${String(i).padStart(4, '0')}.png'`);
      lines.push(`duration ${(durMs / 1000).toFixed(4)}`);
    }
    const concatFile = path.join(FRAMES, 'concat.txt');
    fs.writeFileSync(concatFile, lines.join('\n'));

    // Build GIF
    const palette = path.join(FRAMES, 'palette.png');
    console.log('Building GIF…');
    execSync(
      `ffmpeg -y -f concat -safe 0 -i ${concatFile} ` +
      `-vf "scale=460:-1:flags=lanczos,palettegen=reserve_transparent=0:stats_mode=diff" ` +
      `${palette}`,
      { stdio: 'pipe' }
    );
    execSync(
      `ffmpeg -y -f concat -safe 0 -i ${concatFile} -i ${palette} ` +
      `-lavfi "[0:v]scale=460:-1:flags=lanczos,fps=${OUT_FPS}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" ` +
      `${OUT_FILE}`,
      { stdio: 'pipe' }
    );

    const kb = (fs.statSync(OUT_FILE).size / 1024).toFixed(0);
    console.log(`Done → ${OUT_FILE} (${kb} kB)`);
  } finally {
    await browser.close();
  }
};

run()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => { server.kill(); });
