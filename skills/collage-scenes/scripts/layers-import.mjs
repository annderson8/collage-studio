#!/usr/bin/env node
// layers-import.mjs: register a layer-decomposed scene (e.g. Seedream v5.0 Layer Decomposition on Atlas Cloud)
// so collage.html can animate it. Run from the project root after downloading the layers:
//
//   scenes/layers/01/base.png           the clean background (what's behind every piece)
//   scenes/layers/01/<piece>.png        one transparent PNG per piece (full-canvas or already cropped)
//   scenes/layers/01/layers.json        optional, written from the API response:
//       {"base": "base.png", "layers": [{"file": "moon.png", "name": "moon", "z": 3, "bbox": [x, y, w, h]}, ...]}
//       z = stacking order (higher = in front). bbox is only needed for layers that are already cropped.
//
//   node layers-import.mjs scenes/layers/01 [--min-area 0.002]
//
// Full-canvas layers are trimmed to their visible pixels (originals kept in raw/). Tiny layers (< min-area of
// the frame) and layers that cover almost the whole frame are skipped with a warning.
// Updates scenes/manifest.{json,js}: CUTOUTS["01_moon"] = {src, x, y, w, h, sceneW, sceneH, scene, z, name}, PLATES["01"].

import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { createRequire } from 'module';
import { readManifest, writeManifest, rel } from './manifest.mjs';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const minArea = +opt('--min-area', '0.002');
const dir = argv[0];
if (!dir || !fs.existsSync(dir)) { console.error('usage: node layers-import.mjs scenes/layers/<id> [--min-area 0.002]'); process.exit(2); }

const layersDir = path.resolve(dir), id = path.basename(layersDir);
const scenesDir = path.dirname(path.dirname(layersDir)), root = path.dirname(scenesDir);

const spec = fs.existsSync(path.join(layersDir, 'layers.json')) ? JSON.parse(fs.readFileSync(path.join(layersDir, 'layers.json'), 'utf8')) : {};
const baseFile = spec.base || 'base.png';
if (!fs.existsSync(path.join(layersDir, baseFile))) { console.error(`missing ${path.join(dir, baseFile)} (the clean background layer)`); process.exit(1); }
let layers = spec.layers || fs.readdirSync(layersDir).filter(f => /\.(png|webp)$/i.test(f) && f !== baseFile).sort()
  .map((file, i) => ({ file, name: file.replace(/\.[^.]+$/, ''), z: i + 1 }));
if (!layers.length) { console.error('no layer PNGs found in ' + dir); process.exit(1); }
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'piece';

async function loadPuppeteer() {
  for (const base of [path.join(process.cwd(), 'x.js'), fileURLToPath(import.meta.url)]) {
    try { return (await import(pathToFileURL(createRequire(base).resolve('puppeteer-core')).href)).default; } catch {}
  }
  console.error('puppeteer-core is missing. In the project folder run:  npm i puppeteer-core'); process.exit(1);
}
const exe = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium', (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => p && fs.existsSync(p));
if (!exe) { console.error('No Chrome/Edge found (set CHROME_PATH)'); process.exit(1); }
const mime = f => /\.jpe?g$/i.test(f) ? 'jpeg' : /\.webp$/i.test(f) ? 'webp' : 'png';
const dataURL = f => `data:image/${mime(f)};base64,` + fs.readFileSync(f).toString('base64');

const puppeteer = await loadPuppeteer();
const br = await puppeteer.launch({ executablePath: exe, headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
const pg = await br.newPage();
pg.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exit(1); });
await pg.goto('about:blank');

const base = await pg.evaluate(async src => { const i = new Image(); i.src = src; await i.decode(); return { w: i.naturalWidth, h: i.naturalHeight }; }, dataURL(path.join(layersDir, baseFile)));
const man = readManifest(scenesDir);
for (const k of Object.keys(man.cutouts)) if (man.cutouts[k].scene === id) delete man.cutouts[k];   // re-import replaces the scene
fs.mkdirSync(path.join(layersDir, 'raw'), { recursive: true });

let kept = 0;
for (const L of layers.sort((a, b) => (a.z ?? 0) - (b.z ?? 0))) {
  const rawPath = path.join(layersDir, 'raw', L.file);
  const src = fs.existsSync(rawPath) ? rawPath : path.join(layersDir, L.file);   // re-runs read the untouched original
  if (!fs.existsSync(src)) { console.warn(`  skip ${L.file}: file not found`); continue; }
  const r = await pg.evaluate(async (src, W, H) => {
    const i = new Image(); i.src = src; await i.decode();
    const w = i.naturalWidth, h = i.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(i, 0, 0);
    const d = g.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 12) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return { empty: true, w, h };
    const full = w === W && h === H;
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
    o.getContext('2d').drawImage(c, -x0, -y0);
    return { w, h, full, x0, y0, tw: o.width, th: o.height, cover: n / (W * H), png: o.toDataURL('image/png') };
  }, dataURL(src), base.w, base.h);
  const name = slug(L.name || L.file.replace(/\.[^.]+$/, ''));
  if (r.empty) { console.warn(`  skip ${L.file}: fully transparent`); continue; }
  if (r.cover < minArea) { console.warn(`  skip ${L.file}: tiny (${(r.cover * 100).toFixed(2)}% of the frame)`); continue; }
  if (r.cover > .85) { console.warn(`  skip ${L.file}: covers ${(r.cover * 100).toFixed(0)}% of the frame, looks like a background. Use it as base.png if it is.`); continue; }
  let x, y;
  if (r.full) { x = r.x0; y = r.y0; }
  else if (L.bbox) { x = L.bbox[0] + r.x0; y = L.bbox[1] + r.y0; }
  else { console.warn(`  skip ${L.file}: cropped layer without a bbox in layers.json`); continue; }
  const out = path.join(layersDir, name + '.png');
  if (src !== rawPath) fs.renameSync(src, rawPath);                              // keep the original in raw/
  fs.writeFileSync(out, Buffer.from(r.png.split(',')[1], 'base64'));
  man.cutouts[`${id}_${name}`] = { src: rel(root, out), x, y, w: r.tw, h: r.th, sceneW: base.w, sceneH: base.h, scene: id, z: L.z ?? kept + 1, name };
  kept++;
  console.log(`  ${(`${id}_${name}`).padEnd(24)} z=${String(L.z ?? kept).padEnd(3)} ${r.tw}×${r.th} at ${x},${y}  (${(r.cover * 100).toFixed(1)}% of frame)`);
}
await br.close();
man.plates[id] = rel(root, path.join(layersDir, baseFile));
writeManifest(scenesDir, man);
console.log(`scene ${id}: ${kept} piece(s) + plate ${baseFile} (${base.w}×${base.h}) → ${rel(process.cwd(), path.join(scenesDir, 'manifest.js'))}`);
