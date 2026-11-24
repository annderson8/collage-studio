#!/usr/bin/env node
// layers-check.mjs: see whether the imported layers rebuild each scene.
// Run from the project root after layers-import.mjs:
//
//   node layers-check.mjs [01 02 …]          (no ids = every scene in scenes/manifest.json)
//
// For each scene it writes scenes/layers/<id>/check.png: the original image on the left, the clean base plus every
// layer at its imported place on the right, with a labelled box per layer (L8 z6 = layer_8, stacking order 6).
// All checks side by side go to scenes/check.png. Look for a piece that is missing, too small, or in the wrong
// place: fix it with "bbox" or "skip" in scenes/layers/<id>/layers.json and import that scene again.

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';

const root = process.cwd();
const manFile = path.join(root, 'scenes/manifest.json');
if (!fs.existsSync(manFile)) { console.error('no scenes/manifest.json: run layers-import.mjs first (from the project root)'); process.exit(1); }
const man = JSON.parse(fs.readFileSync(manFile, 'utf8'));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : [...new Set(Object.values(man.cutouts).map(c => c.scene))].sort();

let puppeteer;
try { puppeteer = (await import(createRequire(path.join(root, 'x.js')).resolve('puppeteer-core'))).default; }
catch { console.error('puppeteer-core is missing. In the project folder run:  npm i puppeteer-core'); process.exit(1); }
const exe = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium', (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => p && fs.existsSync(p));
if (!exe) { console.error('No Chrome/Edge found (set CHROME_PATH)'); process.exit(1); }

const du = f => 'data:image/' + (/\.jpe?g$/i.test(f) ? 'jpeg' : /\.webp$/i.test(f) ? 'webp' : 'png') + ';base64,' + fs.readFileSync(path.join(root, f)).toString('base64');
const br = await puppeteer.launch({ executablePath: exe, headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
const pg = await br.newPage();
const outs = [];
for (const id of ids) {
  const scene = fs.readdirSync(path.join(root, 'scenes')).find(f => new RegExp(`^${id}\\.(png|jpe?g|webp)$`, 'i').test(f));
  const plate = man.plates?.[id] || (fs.readdirSync(path.join(root, 'scenes/layers', id)).find(f => /^base\./i.test(f)) && `scenes/layers/${id}/` + fs.readdirSync(path.join(root, 'scenes/layers', id)).find(f => /^base\./i.test(f)));
  if (!scene || !plate) { console.warn(`skip ${id}: needs scenes/${id}.png and its base plate`); continue; }
  const cuts = Object.values(man.cutouts).filter(c => c.scene === id).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  const png = await pg.evaluate(async (orig, base, cuts) => {
    const load = s => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = s; });
    const o = await load(orig), sW = o.naturalWidth, sH = o.naturalHeight, k = 640 / sH, W = Math.round(sW * k), H = 640;
    const c = document.createElement('canvas'); c.width = W * 2 + 10; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, H);
    g.drawImage(o, 0, 0, W, H); g.drawImage(await load(base), W + 10, 0, W, H);
    for (const cu of cuts) g.drawImage(await load(cu.src), W + 10 + cu.x * k, cu.y * k, cu.w * k, cu.h * k);
    g.font = 'bold 13px sans-serif'; g.lineWidth = 2;
    cuts.forEach((cu, i) => { const col = `hsl(${i * 67},90%,38%)`; g.strokeStyle = col; g.fillStyle = col;
      g.strokeRect(cu.x * k, cu.y * k, cu.w * k, cu.h * k);
      g.fillText(String(cu.file || cu.name).replace(/^layer_/, 'L').replace(/\.\w+$/, '') + ' z' + cu.z, cu.x * k + 3, cu.y * k + 14); });
    return c.toDataURL('image/png');
  }, du(`scenes/${scene}`), du(plate), cuts.map(c => ({ ...c, src: du(c.src) })));
  const out = path.join(root, 'scenes/layers', id, 'check.png');
  fs.writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  outs.push(out); console.log(`scene ${id}: ${cuts.length} layer(s) → ${path.relative(root, out)}`);
}
await br.close();
if (outs.length > 1) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...outs.flatMap(o => ['-i', o]), '-filter_complex', outs.map((_, i) => `[${i}]`).join('') + `vstack=inputs=${outs.length}`, path.join(root, 'scenes/check.png')]);
  if (r.status === 0) console.log('all scenes → scenes/check.png');
}
