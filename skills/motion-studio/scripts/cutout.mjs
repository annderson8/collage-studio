#!/usr/bin/env node
// cutout.mjs: cut the pieces out of a collage image and rebuild the background behind them.
// Runs in the installed Chrome (same as render.mjs), so no Python or extra packages.
//
//   node cutout.mjs scene.png --name moon --box 210,80,660,660 [--tol 34] [--feather 1.5]
//        colour-key: everything connected to the box edge that looks like the edge is removed
//   node cutout.mjs scene.png --name pharaoh --box 120,900,300,700 --mask pharaoh_nobg.png
//        use an alpha mask from a background remover (an image-tool MCP, rembg, Photoshop...)
//   node cutout.mjs scene.png --plate [--grow 10]
//        fill the holes left by every piece cut from scene.png → cutouts/<scene>_plate.png
//   options: --out cutouts  --shrink 2 (px eaten from the edge: removes background halos)
//
// Writes <out>/<name>.png (trimmed RGBA) and <out>/manifest.js, which collage.html loads:
//   window.CUTOUTS = {name: {src, x, y, w, h, sceneW, sceneH, scene}}   window.PLATES = {key: src}
// A piece used without x/y in the page lands exactly where it sat in the original image.

import fs from 'fs';
import path from 'path';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const bool = n => { const i = argv.indexOf(n); if (i < 0) return false; argv.splice(i, 1); return true; };
const out = opt('--out', 'cutouts'), name = opt('--name'), box = opt('--box'), tol = +opt('--tol', '34');
const feather = +opt('--feather', '1.5'), shrink = +opt('--shrink', '2'), maskFile = opt('--mask'), grow = +opt('--grow', '10'), plate = bool('--plate');
const scene = argv[0];
if (!scene || (!plate && (!name || !box))) {
  console.error('usage: node cutout.mjs scene.png --name moon --box x,y,w,h [--tol 34] [--mask m.png]  |  scene.png --plate'); process.exit(2);
}

const puppeteer = (await import('puppeteer-core').catch(() => { console.error('npm i puppeteer-core'); process.exit(1); })).default;
const exe = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium', (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => p && fs.existsSync(p));
if (!exe) { console.error('No Chrome/Edge found (set CHROME_PATH)'); process.exit(1); }

fs.mkdirSync(out, { recursive: true });
const manFile = path.join(out, 'manifest.json');
const man = fs.existsSync(manFile) ? JSON.parse(fs.readFileSync(manFile, 'utf8')) : { cutouts: {}, plates: {} };
const dataURL = f => `data:image/${/\.jpe?g$/i.test(f) ? 'jpeg' : /\.webp$/i.test(f) ? 'webp' : 'png'};base64,` + fs.readFileSync(f).toString('base64');
const sceneKey = path.basename(scene).replace(/\.[^.]+$/, '');

const br = await puppeteer.launch({ executablePath: exe, headless: true, args: process.env.CI ? ['--no-sandbox'] : [] });
const pg = await br.newPage();
pg.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exit(1); });
await pg.goto('about:blank');
await pg.addScriptTag({ content: `
  window.load = src => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src; });
  window.pixels = (img, x = 0, y = 0, w = img.naturalWidth, h = img.naturalHeight) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, -x, -y); return g.getImageData(0, 0, w, h);
  };
  window.toPNG = id => { const c = document.createElement('canvas'); c.width = id.width; c.height = id.height; c.getContext('2d').putImageData(id, 0, 0); return c.toDataURL('image/png'); };
  window.blurAlpha = (a, w, h, r) => { // box blur ×2 on a Float32 alpha map
    if (r <= 0) return a; const t = new Float32Array(a.length), R = Math.round(r);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = -R; k <= R; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += a[y * w + xx]; n++; } } t[y * w + x] = s / n; }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = -R; k <= R; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += t[yy * w + x]; n++; } } a[y * w + x] = s / n; }
    } return a;
  };
`});

if (!plate) {
  const [bx, by, bw, bh] = box.split(',').map(Number);
  const res = await pg.evaluate(async (src, bx, by, bw, bh, tol, feather, maskSrc, shrink) => {
    const img = await load(src), id = pixels(img, bx, by, bw, bh), d = id.data, w = bw, h = bh, N = w * h;
    let a = new Float32Array(N);
    if (maskSrc) { // external mask: alpha channel if present, else luminance
      const m = pixels(await load(maskSrc), bx, by, bw, bh)   // mask has the scene's size.data;
      let hasAlpha = false; for (let i = 3; i < m.length; i += 4) if (m[i] < 250) { hasAlpha = true; break; }
      for (let i = 0; i < N; i++) a[i] = hasAlpha ? m[i * 4 + 3] / 255 : (m[i * 4] + m[i * 4 + 1] + m[i * 4 + 2]) / 765;
    } else { // flood fill the background from the box edge
      const edge = []; for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x); for (let y = 0; y < h; y++) edge.push(y * w, y * w + w - 1);
      const med = k => { const v = edge.map(i => d[i * 4 + k]).sort((p, q) => p - q); return v[v.length >> 1]; };
      const bg = [med(0), med(1), med(2)], bgSet = new Uint8Array(N), q = [];
      const near = i => Math.hypot(d[i * 4] - bg[0], d[i * 4 + 1] - bg[1], d[i * 4 + 2] - bg[2]) < tol;
      for (const i of edge) if (!bgSet[i] && near(i)) { bgSet[i] = 1; q.push(i); }
      while (q.length) { const i = q.pop(), x = i % w, y = (i / w) | 0;
        for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (j >= 0 && !bgSet[j] && near(j)) { bgSet[j] = 1; q.push(j); } }
      for (let i = 0; i < N; i++) a[i] = bgSet[i] ? 0 : 1;
      for (let k = 0; k < shrink; k++) { const b = a.slice(); // erode: drop the background-tinted rim
        for (let i = 0; i < N; i++) if (b[i]) { const x = i % w; if ((x > 0 && !b[i - 1]) || (x < w - 1 && !b[i + 1]) || (i >= w && !b[i - w]) || (i < N - w && !b[i + w])) a[i] = 0; } }
    }
    blurAlpha(a, w, h, feather);
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x] > .1) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    if (x1 < 0) return { empty: true };
    const tw = x1 - x0 + 1, th = y1 - y0 + 1, o = new ImageData(tw, th);
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const si = (y + y0) * w + x + x0, di = y * tw + x;
      o.data.set([d[si * 4], d[si * 4 + 1], d[si * 4 + 2], Math.round(255 * Math.min(1, a[si] * 1.15))], di * 4); }
    const kept = a.reduce((s, v) => s + (v > .5), 0) / N;
    return { png: toPNG(o), x: bx + x0, y: by + y0, w: tw, h: th, sceneW: img.naturalWidth, sceneH: img.naturalHeight, kept };
  }, dataURL(scene), bx, by, bw, bh, tol, feather, maskFile ? dataURL(maskFile) : null, shrink);
  if (res.empty) { console.error('nothing left after keying: lower --tol or check --box'); process.exit(1); }
  const file = path.join(out, name + '.png');
  fs.writeFileSync(file, Buffer.from(res.png.split(',')[1], 'base64'));
  man.cutouts[name] = { src: file.split(path.sep).join('/'), x: res.x, y: res.y, w: res.w, h: res.h, sceneW: res.sceneW, sceneH: res.sceneH, scene: sceneKey };
  console.log(`${name}: ${res.w}×${res.h} at ${res.x},${res.y} · piece covers ${(res.kept * 100).toFixed(0)}% of the box → ${file}`);
  if (res.kept > .92) console.warn('  warning: almost nothing was keyed out. Raise --tol, tighten --box, or pass --mask.');
} else {
  const pieces = Object.entries(man.cutouts).filter(([, m]) => m.scene === sceneKey);
  if (!pieces.length) { console.error('no cut-outs registered for ' + sceneKey); process.exit(1); }
  const res = await pg.evaluate(async (src, pieces, grow) => {
    const img = await load(src), id = pixels(img), d = id.data, w = id.width, h = id.height, N = w * h;
    const hole = new Float32Array(N);
    for (const p of pieces) { const pid = pixels(await load(p.data)); for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const X = x + p.x, Y = y + p.y; if (X < w && Y < h && pid.data[(y * p.w + x) * 4 + 3] > 20) hole[Y * w + X] = 1; } }
    blurAlpha(hole, w, h, grow / 2); // grow the holes so edge halos go too
    const known = new Uint8Array(N); let todo = 0; for (let i = 0; i < N; i++) { known[i] = hole[i] < .02 ? 1 : 0; todo += !known[i]; }
    // onion-peel fill: from the hole border inwards, each pixel = mean of known pixels around it
    let front = []; const isFront = i => { const x = i % w; return (x > 0 && known[i - 1]) || (x < w - 1 && known[i + 1]) || known[i - w] || known[i + w]; };
    for (let i = 0; i < N; i++) if (!known[i] && isFront(i)) front.push(i);
    const R = 3, seen = new Uint8Array(N);
    while (front.length) {
      const next = [], vals = [];
      for (const i of front) { const x = i % w, y = (i / w) | 0; let r = 0, g = 0, b = 0, n = 0;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const j = yy * w + xx;
          if (known[j]) { r += d[j * 4]; g += d[j * 4 + 1]; b += d[j * 4 + 2]; n++; } }
        vals.push([i, r / n, g / n, b / n]); }
      for (const [i, r, g, b] of vals) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; known[i] = 1; }
      for (const [i] of vals) { const x = i % w; for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) if (j >= 0 && j < N && !known[j] && !seen[j]) { seen[j] = 1; next.push(j); } }
      front = next;
    }
    let s = 12345; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296 - .5);
    for (let i = 0; i < N; i++) if (hole[i] > .02) { const n = rnd() * 14; d[i * 4] += n; d[i * 4 + 1] += n; d[i * 4 + 2] += n; } // re-grain
    return { png: toPNG(id), todo };
  }, dataURL(scene), pieces.map(([, m]) => ({ ...m, data: dataURL(m.src) })), grow);
  const file = path.join(out, sceneKey + '_plate.png');
  fs.writeFileSync(file, Buffer.from(res.png.split(',')[1], 'base64'));
  man.plates[sceneKey] = file.split(path.sep).join('/');
  console.log(`plate for ${sceneKey}: filled ${res.todo} px behind ${pieces.length} piece(s) → ${file}`);
  console.log('  For big holes on detailed backgrounds, an image model "remove the <piece>" edit gives a cleaner plate.');
}
await br.close();
fs.writeFileSync(manFile, JSON.stringify(man, null, 1));
fs.writeFileSync(path.join(out, 'manifest.js'), `window.CUTOUTS = ${JSON.stringify(man.cutouts)};\nwindow.PLATES = ${JSON.stringify(man.plates)};\n`);
