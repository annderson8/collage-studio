#!/usr/bin/env node
// motion-studio renderer: drives the Chrome/Edge already installed on the machine (puppeteer-core)
// and pipes every frame of a pure `render(f)` canvas page into ffmpeg.
//
//   node render.mjs --check                                   environment report
//   node render.mjs piece.html out.mp4 [--from s] [--to s]    render (all frames or a time range)
//   node render.mjs piece.html out.mp4 --jobs 4               split into 4 parallel renders, then join
//   node render.mjs piece.html --stills 0.5 3 7               PNG stills + stills/row.png contact row
//
// Also writes <out>.events.json ({fps, nf, duration, events}) from window.EVENTS for score.mjs.
// Browser override: CHROME_PATH=/path/to/chrome

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, spawnSync } from 'child_process';
import { pathToFileURL, fileURLToPath } from 'url';

const argv = process.argv.slice(2);
const flag = (name, def) => { const i = argv.indexOf(name); if (i < 0) return def; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const bool = name => { const i = argv.indexOf(name); if (i < 0) return false; argv.splice(i, 1); return true; };

function findBrowser() {
  const L = process.env.LOCALAPPDATA || '', H = os.homedir();
  const c = [
    process.env.CHROME_PATH,
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    H + '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // Windows
    L + '/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    // Linux
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge', '/snap/bin/chromium',
  ];
  return c.find(p => p && fs.existsSync(p));
}
const has = bin => spawnSync(bin, ['-version'], { stdio: 'ignore' }).status === 0;

async function loadPuppeteer() {
  try { return (await import('puppeteer-core')).default; }
  catch { console.error('puppeteer-core is missing. Run:  npm i puppeteer-core   (in this folder)'); process.exit(1); }
}

// ---------- --check ----------
if (bool('--check')) {
  const nodeOk = +process.versions.node.split('.')[0] >= 18;
  let pup = true; try { await import('puppeteer-core'); } catch { pup = false; }
  const rows = [
    ['node >= 18', nodeOk, process.versions.node],
    ['ffmpeg', has('ffmpeg'), 'brew install ffmpeg | winget install ffmpeg | apt install ffmpeg'],
    ['ffprobe', has('ffprobe'), 'ships with ffmpeg'],
    ['Chrome / Edge / Chromium', !!findBrowser(), findBrowser() || 'install Chrome, or set CHROME_PATH'],
    ['puppeteer-core', pup, pup ? 'ok' : 'npm i puppeteer-core'],
  ];
  for (const [n, ok, note] of rows) console.log(`${ok ? '✓' : '✗'} ${n.padEnd(26)} ${note}`);
  process.exit(rows.every(r => r[1]) ? 0 : 1);
}

const [page, out, ...rest] = argv;
if (!page || !out) { console.error('usage: node render.mjs piece.html out.mp4 [--from s] [--to s] [--jobs N] | piece.html --stills s1 s2 ... | --check'); process.exit(2); }
const crf = flag('--crf', '16');
const exe = findBrowser();
if (!exe) { console.error('No Chrome/Edge/Chromium found. Install one or set CHROME_PATH.'); process.exit(1); }

async function openPage() {
  const puppeteer = await loadPuppeteer();
  const br = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--allow-file-access-from-files', '--disable-web-security', ...(process.env.CI ? ['--no-sandbox'] : [])], protocolTimeout: 900000 });
  const pg = await br.newPage();
  pg.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exit(1); });
  pg.on('console', m => { const t = m.text(); if ((m.type() === 'error' || m.type() === 'warning') && !t.includes('ERR_FILE_NOT_FOUND')) console.error('[page]', t); }); // optional voice.js / manifest.js may be absent
  await pg.goto(pathToFileURL(path.resolve(page)).href + '?render=1');
  await pg.waitForFunction('window.READY===true', { timeout: 300000 });
  const meta = await pg.evaluate(() => ({ fps: FPS, nf: NF, w: W, h: H, events: window.EVENTS || [] }));
  const grab = async f => Buffer.from((await pg.evaluate(f => { render(f); return document.querySelector('canvas').toDataURL('image/png'); }, f)).split(',')[1], 'base64');
  return { br, meta, grab };
}

async function encode(grab, fps, f0, f1, file, tag = '') {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-crf', crf, '-preset', 'medium', '-pix_fmt', 'yuv420p', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    if (!ff.stdin.write(await grab(f))) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 48 === 0) console.log(`${tag}frame ${f}/${f1} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  const code = await new Promise(r => ff.on('close', r));
  if (code) { console.error('ffmpeg failed'); process.exit(1); }
}

// ---------- stills ----------
if (out === '--stills') {
  const { br, meta, grab } = await openPage();
  fs.mkdirSync('stills', { recursive: true });
  const files = [];
  for (const s of rest) {
    const f = Math.min(meta.nf - 1, Math.round(+s * meta.fps));
    const file = `stills/s_${s}.png`; fs.writeFileSync(file, await grab(f)); files.push(file);
  }
  await br.close();
  if (files.length > 1) { // one small contact row to judge them together
    const ins = files.flatMap(f => ['-i', f]);
    const sc = files.map((_, i) => `[${i}]scale=360:-1[v${i}]`).join(';');
    const st = files.map((_, i) => `[v${i}]`).join('') + `hstack=inputs=${files.length}`;
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...ins, '-filter_complex', `${sc};${st}`, 'stills/row.png'], { stdio: 'inherit' });
    console.log('wrote', files.join(' '), '+ stills/row.png');
  } else console.log('wrote', files.join(' '));
  process.exit(0);
}

// ---------- internal: a single worker range (used by --jobs) ----------
const frames = flag('--frames');
if (frames) {
  const [a, b] = frames.split(':').map(Number);
  const { br, meta, grab } = await openPage();
  await encode(grab, meta.fps, a, b, out, `[${a}-${b}] `);
  await br.close(); process.exit(0);
}

// ---------- full / ranged render ----------
const from = flag('--from'), to = flag('--to'), jobs = Math.max(1, +flag('--jobs', '1'));
const { br, meta, grab } = await openPage();
const f0 = from ? Math.round(+from * meta.fps) : 0, f1 = to ? Math.min(meta.nf, Math.round(+to * meta.fps)) : meta.nf;
const evFile = out.replace(/\.[^.]+$/, '') + '.events.json';
fs.writeFileSync(evFile, JSON.stringify({ fps: meta.fps, nf: meta.nf, duration: meta.nf / meta.fps, events: meta.events }, null, 1));
console.log(`${meta.w}×${meta.h} @${meta.fps}fps · frames ${f0}–${f1} · ${meta.events.length} events → ${evFile}`);

if (jobs === 1) { await encode(grab, meta.fps, f0, f1, out); await br.close(); }
else {
  await br.close();
  const self = fileURLToPath(import.meta.url), n = f1 - f0, parts = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-'));
  const runs = [];
  for (let j = 0; j < jobs; j++) {
    const a = f0 + Math.floor(n * j / jobs), b = f0 + Math.floor(n * (j + 1) / jobs); if (b <= a) continue;
    const part = path.join(tmp, `part_${j}.mp4`); parts.push(part);
    runs.push(new Promise((res, rej) => spawn(process.execPath, [self, page, part, '--frames', `${a}:${b}`, '--crf', crf], { stdio: 'inherit' })
      .on('close', c => c ? rej(new Error('job ' + j + ' failed')) : res())));
  }
  await Promise.all(runs);
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  if (r.status) process.exit(1);
}
console.log('wrote', out);
