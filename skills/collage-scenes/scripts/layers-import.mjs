#!/usr/bin/env node
// layers-import.mjs: register a layer-decomposed scene so collage.html can animate it.
// Built for Seedream v5.0 Layer Decomposition on Atlas Cloud, which returns only files:
//   base.jpeg (clean background) + layer_1.png … layer_N.png (each cropped to its piece, no positions, no names)
// Run from the project root after downloading them into scenes/layers/<id>/:
//
//   node layers-import.mjs scenes/layers/01 [--min-area 0.0006]
//
// It finds where each cropped layer sits by matching it against the original scene image (scenes/<id>.png),
// works out which layer is in front where they overlap, trims, and writes scenes/manifest.{json,js}.
// Optional scenes/layers/<id>/layers.json to name pieces or drop some (e.g. text baked into the image):
//   {"layers": [{"file": "layer_5.png", "name": "pharaoh_left"}, {"file": "layer_9.png", "skip": true}]}
// Optional per layer: "z" (force stacking, higher = front) and "bbox": [x, y, w, h] (skip the search).

import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { createRequire } from 'module';
import { readManifest, writeManifest, rel } from './manifest.mjs';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const minArea = +opt('--min-area', '0.0006');
const dir = argv[0];
if (!dir || !fs.existsSync(dir)) { console.error('usage: node layers-import.mjs scenes/layers/<id> [--min-area 0.0006]'); process.exit(2); }

const layersDir = path.resolve(dir), id = path.basename(layersDir);
const scenesDir = path.dirname(path.dirname(layersDir)), root = path.dirname(scenesDir);
const rawDir = path.join(layersDir, 'raw');
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const isImg = f => /\.(png|webp|jpe?g)$/i.test(f);
const find = (d, re) => fs.existsSync(d) ? fs.readdirSync(d).find(f => re.test(f)) : undefined;

const spec = fs.existsSync(path.join(layersDir, 'layers.json')) ? JSON.parse(fs.readFileSync(path.join(layersDir, 'layers.json'), 'utf8')) : {};
const baseFile = spec.base || find(layersDir, /^base\.(png|jpe?g|webp)$/i);
if (!baseFile) { console.error(`no base image (base.png/.jpeg) in ${dir}: that's the clean background layer`); process.exit(1); }
const sceneFile = find(scenesDir, new RegExp(`^${id}\\.(png|jpe?g|webp)$`, 'i'));

// layer list: from raw/ on re-runs (originals), else from the folder; layers.json adds names/skip/z/bbox
fs.mkdirSync(rawDir, { recursive: true });
let files = fs.readdirSync(rawDir).filter(isImg);
if (!files.length) {
  files = fs.readdirSync(layersDir).filter(f => isImg(f) && f !== baseFile);
  for (const f of files) fs.renameSync(path.join(layersDir, f), path.join(rawDir, f));        // keep originals untouched
}
files.sort(natural);
const meta = Object.fromEntries((spec.layers || []).map(l => [l.file, l]));
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
const br = await puppeteer.launch({ executablePath: exe, headless: true, protocolTimeout: 900000, args: process.env.CI ? ['--no-sandbox'] : [] });
const pg = await br.newPage();
pg.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exit(1); });
await pg.goto('about:blank');

const res = await pg.evaluate(async (baseSrc, sceneSrc, layers, minArea) => {
  const load = src => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src; });
  const pix = (img, w = img.naturalWidth || img.width, h = img.naturalHeight || img.height) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h); return g.getImageData(0, 0, w, h);
  };
  const base = await load(baseSrc), W = base.naturalWidth, H = base.naturalHeight;
  const scene = sceneSrc ? await load(sceneSrc) : null;
  const S = scene ? pix(scene, W, H) : null;
  const F = 6, sw = Math.ceil(W / F), sh = Math.ceil(H / F), Sc = scene ? pix(scene, sw, sh) : null;

  // best coarse position of a layer drawn at scale k (layer px → scene px), searched at 1/F resolution
  function coarse(img, k) {
    const lw = Math.max(1, Math.round(img.naturalWidth * k / F)), lh = Math.max(1, Math.round(img.naturalHeight * k / F));
    if (lw > sw || lh > sh) return { score: 1e18 };
    const small = pix(img, lw, lh).data, pts = [];
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const i = (y * lw + x) * 4; if (small[i + 3] > 200) pts.push([x, y, small[i], small[i + 1], small[i + 2]]); }
    if (!pts.length) return { score: 1e18 };
    const step = Math.max(1, Math.floor(pts.length / 1200)), sp = pts.filter((_, q) => q % step === 0);
    let best = 1e18, bx = 0, by = 0; const d = Sc.data;
    for (let oy = 0; oy <= sh - lh; oy++) for (let ox = 0; ox <= sw - lw; ox++) {
      let s = 0;
      for (const [x, y, r, g, b] of sp) { const i = ((oy + y) * sw + ox + x) * 4; s += Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - b); if (s >= best) break; }
      if (s < best) { best = s; bx = ox; by = oy; }
    }
    return { score: best / sp.length, bx, by };
  }
  // each cropped layer can come back at its own scale (the model re-renders pieces). Blurry coarse matches favour
  // tiny scales, so keep the 5 best distinct scales from the coarse pass and decide at full resolution.
  function fit(img, data0) {
    const cands = [];
    for (let k = .12; k <= 1.7; k *= 1.07) cands.push({ k, ...coarse(img, k) });
    cands.push({ k: 1, ...coarse(img, 1) });                     // unscaled is common: always try it
    cands.sort((a, b) => a.score - b.score);
    const top = [];
    for (const c of cands) { if (top.every(t => Math.abs(Math.log(t.k / c.k)) > .12)) top.push(c); if (top.length === 5) break; }
    let best = null;
    for (const c of top) for (const k of [c.k / 1.03, c.k, c.k * 1.03]) {
      const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      if (w > W || h > H || w < 8 || h < 8) continue;
      const id = pix(img, w, h), cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').putImageData(id, 0, 0);
      const r = locate({ width: w, height: h, data: id.data }, c.bx, c.by);
      if (r && (!best || r.err < best.err)) best = { ...r, k };
    }
    return best;
  }

  // where does this cropped layer sit? coarse search at 1/F scale, then a full-resolution refine
  // full-resolution refine around a coarse hit (bx, by in 1/F units)
  function locate(L, bx, by) {
    const full = L.data, fp = [];
    for (let y = 0; y < L.height; y += 3) for (let x = 0; x < L.width; x += 3) { const i = (y * L.width + x) * 4; if (full[i + 3] > 200) fp.push([x, y, full[i], full[i + 1], full[i + 2]]); }
    let fb = 1e18, fx = bx * F, fy = by * F;
    for (let oy = by * F - F - 2; oy <= by * F + F + 2; oy++) for (let ox = bx * F - F - 2; ox <= bx * F + F + 2; ox++) {
      if (ox < 0 || oy < 0 || ox + L.width > W || oy + L.height > H) continue;
      let s = 0;
      for (const [x, y, r, g, b] of fp) { const i = ((oy + y) * W + ox + x) * 4; s += Math.abs(S.data[i] - r) + Math.abs(S.data[i + 1] - g) + Math.abs(S.data[i + 2] - b); if (s >= fb) break; }
      if (s < fb) { fb = s; fx = ox; fy = oy; }
    }
    return { x: fx, y: fy, err: fb / fp.length / 3 };
  }

  const out = [];
  for (const L of layers) {
    const img = await load(L.src), full = img.naturalWidth === W && img.naturalHeight === H;
    const fitted = !full && !L.bbox && S ? fit(img) : null;
    const K = full ? 1 : L.bbox ? L.bbox[2] / img.naturalWidth : fitted ? fitted.k : 1;
    const id0 = pix(img, Math.round(img.naturalWidth * K), Math.round(img.naturalHeight * K)), w = id0.width, h = id0.height, data = id0.data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 12) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const o = { file: L.file, w, h };
    if (x1 < 0) { out.push({ ...o, skip: 'fully transparent' }); continue; }
    const cover = n / (W * H);
    if (cover < minArea) { out.push({ ...o, skip: `tiny (${(cover * 100).toFixed(2)}% of the frame)` }); continue; }
    if (cover > .85) { out.push({ ...o, skip: `covers ${(cover * 100).toFixed(0)}% of the frame (a background?)` }); continue; }
    let pos, how;
    if (full) { pos = { x: 0, y: 0, err: 0 }; how = 'full-canvas'; }
    else if (L.bbox) { pos = { x: L.bbox[0], y: L.bbox[1], err: 0 }; how = 'bbox'; }
    else if (fitted) { pos = fitted; how = 'matched'; }
    else { out.push({ ...o, skip: 'cropped layer, no bbox and no scenes/<id> image to match against' }); continue; }
    const t = document.createElement('canvas'); t.width = x1 - x0 + 1; t.height = y1 - y0 + 1;
    const tg = t.getContext('2d'); tg.putImageData(new ImageData(data, w, h), -x0, -y0);
    out.push({ ...o, K, x: pos.x + x0, y: pos.y + y0, tw: t.width, th: t.height, cover, err: pos.err, how, png: t.toDataURL('image/png'),
      alpha: Array.from({ length: t.width * t.height }, (_, k) => data[((y0 + ((k / t.width) | 0)) * w + x0 + k % t.width) * 4 + 3] > 128 ? 1 : 0),
      rgb: data, srcW: w, ox: pos.x, oy: pos.y });
  }

  // stacking: where two layers overlap, the one that matches the scene there is in front
  const kept = out.filter(o => !o.skip), front = new Map(kept.map(o => [o.file, new Set()])), pairs = [];
  if (S) for (let a = 0; a < kept.length; a++) for (let b = a + 1; b < kept.length; b++) {
    const A = kept[a], B = kept[b];
    const ix0 = Math.max(A.x, B.x), iy0 = Math.max(A.y, B.y), ix1 = Math.min(A.x + A.tw, B.x + B.tw), iy1 = Math.min(A.y + A.th, B.y + B.th);
    if (ix1 <= ix0 || iy1 <= iy0) continue;
    let ea = 0, eb = 0, n = 0;
    for (let y = iy0; y < iy1; y += 2) for (let x = ix0; x < ix1; x += 2) {
      if (!A.alpha[(y - A.y) * A.tw + x - A.x] || !B.alpha[(y - B.y) * B.tw + x - B.x]) continue;
      const si = (y * W + x) * 4, ai = ((y - A.oy) * A.srcW + x - A.ox) * 4, bi = ((y - B.oy) * B.srcW + x - B.ox) * 4;
      for (let c = 0; c < 3; c++) { ea += Math.abs(S.data[si + c] - A.rgb[ai + c]); eb += Math.abs(S.data[si + c] - B.rgb[bi + c]); }
      n++;
    }
    pairs.push([A.file, B.file, n, ea / Math.max(1, n), eb / Math.max(1, n)]);
    if (n < 30) continue;
    if (ea < eb) front.get(A.file).add(B.file); else front.get(B.file).add(A.file);   // A in front of B
  }
  // order back → front: a layer goes after everything it covers (falls back to file order on cycles)
  const order = [], placed = new Set();
  while (order.length < kept.length) {
    const next = kept.find(o => !placed.has(o.file) && [...front.get(o.file)].every(f => placed.has(f))) || kept.find(o => !placed.has(o.file));
    order.push(next.file); placed.add(next.file);
  }
  return { W, H, pairs, layers: out.map(o => ({ K: o.K, file: o.file, skip: o.skip, x: o.x, y: o.y, w: o.tw, h: o.th, cover: o.cover, err: o.err, how: o.how, png: o.png, z: o.skip ? null : order.indexOf(o.file) + 1 })) };
}, dataURL(path.join(layersDir, baseFile)), sceneFile ? dataURL(path.join(scenesDir, sceneFile)) : null,
  files.filter(f => !meta[f]?.skip).map(f => ({ file: f, src: dataURL(path.join(rawDir, f)), bbox: meta[f]?.bbox })), minArea);
await br.close();
if (process.env.DEBUG) for (const [a, b, n, ea, eb] of res.pairs) console.log(`  overlap ${a} / ${b}: ${n} px, err ${ea.toFixed(1)} vs ${eb.toFixed(1)}`);

const man = readManifest(scenesDir);
for (const k of Object.keys(man.cutouts)) if (man.cutouts[k].scene === id) delete man.cutouts[k];   // re-import replaces the scene
for (const f of fs.readdirSync(layersDir)) if (/\.png$/i.test(f) && f !== baseFile) fs.rmSync(path.join(layersDir, f));
const used = new Set();
for (const f of files.filter(f => meta[f]?.skip)) console.log(`  skip ${f}: layers.json`);
let kept = 0;
for (const L of res.layers.sort((a, b) => (meta[a.file]?.z ?? a.z ?? 0) - (meta[b.file]?.z ?? b.z ?? 0))) {
  if (L.skip) { console.warn(`  skip ${L.file}: ${L.skip}`); continue; }
  let name = slug(meta[L.file]?.name || L.file.replace(/\.[^.]+$/, '')); while (used.has(name)) name += '_'; used.add(name);
  const out = path.join(layersDir, name + '.png');
  fs.writeFileSync(out, Buffer.from(L.png.split(',')[1], 'base64'));
  const z = meta[L.file]?.z ?? L.z;
  man.cutouts[`${id}_${name}`] = { src: rel(root, out), x: L.x, y: L.y, w: L.w, h: L.h, sceneW: res.W, sceneH: res.H, scene: id, z, name, file: L.file };
  kept++;
  const warn = L.err > 28 ? '  ⚠ weak match: check it, or give a bbox in layers.json' : '';
  console.log(`  ${(`${id}_${name}`).padEnd(22)} z=${String(z).padEnd(3)} ${String(L.w + '×' + L.h).padEnd(10)} at ${String(L.x + ',' + L.y).padEnd(10)} ${L.how}${L.how === 'matched' ? ` ×${L.K.toFixed(2)} (err ${L.err.toFixed(1)})` : ''}${warn}`);
}
man.plates[id] = rel(root, path.join(layersDir, baseFile));
writeManifest(scenesDir, man);
if (!sceneFile) console.warn(`  note: no scenes/${id}.png found; cropped layers can't be placed without it`);
console.log(`scene ${id}: ${kept} piece(s) + plate ${baseFile} (${res.W}×${res.H}) → ${rel(process.cwd(), path.join(scenesDir, 'manifest.js'))}`);
