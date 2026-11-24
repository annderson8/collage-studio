#!/usr/bin/env node
// score.mjs: synthesize a picture-synced sound track from the events render.mjs exported.
// Plain Node, no packages.
//
//   node score.mjs out.events.json sfx.wav [--style paper|paper+music] [--seed 7]
//
// Event types (from window.EVENTS): tear, thud, pop, swish, rustle, flutter, tick, riser, impact, chime.
// "paper" = soft paper sounds only, no music (the collage look).
// "paper+music" adds a quiet detuned pad that changes chord at every tear (scene change).
// Add new instruments as functions in SFX; every hit is driven by the same event times as the picture.

import fs from 'fs';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const style = opt('--style', 'paper'), seed = +opt('--seed', '7');
const [evFile, outFile = 'sfx.wav'] = argv;
if (!evFile) { console.error('usage: node score.mjs out.events.json sfx.wav [--style paper|paper+music]'); process.exit(2); }
const { duration, events } = JSON.parse(fs.readFileSync(evFile, 'utf8'));

const SR = 48000, N = Math.ceil((duration + 1) * SR);
const L = new Float32Array(N), R = new Float32Array(N), VL = new Float32Array(N), VR = new Float32Array(N); // dry + reverb send
let s = seed >>> 0; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const noise = () => rnd() * 2 - 1;

function svf() { // TPT state-variable filter; call per sample with a (possibly gliding) cutoff
  let a = 0, b = 0;
  return (x, fc, q = .7, mode = 'bp') => {
    const g = Math.tan(Math.PI * Math.min(fc, SR * .45) / SR), k = 1 / q, a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - b, v1 = a1 * a + a2 * v3, v2 = b + a2 * a + a3 * v3; a = 2 * v1 - a; b = 2 * v2 - b;
    return mode === 'lp' ? v2 : mode === 'bp' ? v1 : x - k * v1 - v2;
  };
}
function put(i, x, pan = 0, send = .2) {
  if (i < 0 || i >= N) return;
  const l = x * Math.cos((pan + 1) * Math.PI / 4), r = x * Math.sin((pan + 1) * Math.PI / 4);
  L[i] += l; R[i] += r; VL[i] += l * send; VR[i] += r * send;
}
const env = (u, att, rel) => u < att ? u / att : Math.exp(-(u - att) / rel);

const SFX = {
  // torn paper: crackly band-passed noise sweeping up, with a body underneath
  tear(t, e) {
    const d = .55, n = d * SR, f1 = svf(), f2 = svf(), i0 = Math.round(t * SR); let crack = 1;
    for (let i = 0; i < n; i++) {
      const u = i / n; if (i % 90 === 0) crack = rnd() < .22 ? 1 : .25 + rnd() * .3;
      const amp = Math.sin(Math.PI * Math.min(1, u * 1.4)) ** .6 * crack;
      const x = f1(noise(), 1400 + 3200 * u, 1.1) * .9 + f2(noise(), 500, .8, 'lp') * .25;
      put(i0 + i, x * amp * .55, -.3 + .6 * u, .25);
    }
  },
  // a cut-out landing: low paper thump + short slap
  thud(t) {
    const n = .35 * SR, f = svf(), i0 = Math.round(t * SR); let ph = 0;
    for (let i = 0; i < n; i++) {
      const u = i / SR; ph += 2 * Math.PI * (55 + 70 * Math.exp(-u * 30)) / SR;
      put(i0 + i, Math.sin(ph) * Math.exp(-u * 14) * .7 + f(noise(), 900, .9) * Math.exp(-u * 60) * .5, 0, .15);
    }
  },
  pop(t) {
    const n = .12 * SR, f = svf(), i0 = Math.round(t * SR); let ph = 0;
    for (let i = 0; i < n; i++) {
      const u = i / SR; ph += 2 * Math.PI * (700 - 2600 * u) / SR;
      put(i0 + i, (f(noise(), 2600, 1.4) * Math.exp(-u * 90) * .6 + Math.sin(ph) * Math.exp(-u * 40) * .25), (rnd() - .5) * .4, .2);
    }
  },
  swish(t) { // paper moving through air
    const d = .42, n = d * SR, f = svf(), i0 = Math.round(t * SR);
    for (let i = 0; i < n; i++) { const u = i / n; put(i0 + i, f(noise(), 500 + 2600 * u, 1.2) * Math.sin(Math.PI * u) ** 1.5 * .5, -.5 + u, .3); }
  },
  rustle(t) { // a sheet sliding into place
    const d = .5, n = d * SR, f = svf(), i0 = Math.round(t * SR); let g = 0;
    for (let i = 0; i < n; i++) { if (i % 240 === 0) g = rnd() ** 2; const u = i / n; put(i0 + i, f(noise(), 3000, .9) * g * Math.sin(Math.PI * u) * .35, (rnd() - .5) * .3, .25); }
  },
  flutter(t, e) { // many small paper leaves
    const c = Math.min(14, e.count || 8);
    for (let k = 0; k < c; k++) SFX.tick(t + rnd() * 1.1, { gain: .18 + rnd() * .12, pan: rnd() * 1.6 - .8 });
  },
  tick(t, e = {}) {
    const n = .03 * SR, f = svf(), i0 = Math.round(t * SR), fc = 3500 + rnd() * 2500;
    for (let i = 0; i < n; i++) put(i0 + i, f(noise(), fc, 2) * Math.exp(-i / SR * 160) * (e.gain ?? .3), e.pan ?? 0, .35);
  },
  riser(t, e = {}) { // ends at t
    const d = e.dur || 1, n = d * SR, f = svf(), i0 = Math.round((t - d) * SR);
    for (let i = 0; i < n; i++) { const u = i / n; put(i0 + i, f(noise(), 300 + 5000 * u * u, 2) * u * u * .4, 0, .4); }
  },
  impact(t) { SFX.thud(t); SFX.tick(t, { gain: .4 }); },
  chime(t, e = {}) { // inharmonic bell
    const n = 2.5 * SR, i0 = Math.round(t * SR), f0 = e.freq || 880, parts = [[1, 1], [2.76, .5], [5.4, .25], [8.93, .12]];
    for (let i = 0; i < n; i++) { const u = i / SR; let x = 0; for (const [m, a] of parts) x += Math.sin(2 * Math.PI * f0 * m * u) * a * Math.exp(-u * (1.5 + m)); put(i0 + i, x * .18, .2, .5); }
  },
};

// quiet room tone so silence between hits doesn't feel dead
{ const f = svf(); for (let i = 0; i < N; i++) { const x = f(noise(), 500, .5, 'lp') * .012; L[i] += x; R[i] += x; } }

if (style.includes('music')) { // pad that changes chord where the picture changes
  const cuts = [0, ...events.filter(e => e.type === 'tear').map(e => e.t), duration + 1];
  const chords = [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 311.1]];
  for (let c = 0; c < cuts.length - 1; c++) {
    const a = Math.round(cuts[c] * SR), b = Math.min(N, Math.round(cuts[c + 1] * SR)), ch = chords[c % chords.length];
    for (let i = a; i < b; i++) {
      const u = (i - a) / SR, fade = Math.min(1, u / .4, (b - i) / SR / .3); let x = 0;
      for (const fr of ch) for (const dt of [-.6, .6]) x += Math.sin(2 * Math.PI * (fr + dt) * i / SR);
      put(i, x * .022 * fade, 0, .6);
    }
  }
}

let unknown = new Set();
for (const e of events) (SFX[e.type] || (unknown.add(e.type), SFX.pop))(e.t, e);
if (unknown.size) console.warn('unknown event types (played as pop):', [...unknown].join(', '));

// small-room reverb (Freeverb-style: 4 combs + 2 allpasses per side)
function reverb(src, spread) {
  const out = new Float32Array(N), combs = [1116, 1188, 1277, 1356].map(d => ({ b: new Float32Array(d + spread), i: 0, f: 0 }));
  const aps = [556, 441].map(d => ({ b: new Float32Array(d + spread), i: 0 }));
  for (let n = 0; n < N; n++) {
    let y = 0;
    for (const c of combs) { const o = c.b[c.i]; c.f = o * .6 + c.f * .4; c.b[c.i] = src[n] * .5 + c.f * .72; c.i = (c.i + 1) % c.b.length; y += o; }
    for (const a of aps) { const o = a.b[a.i]; a.b[a.i] = y + o * .5; y = o - y; a.i = (a.i + 1) % a.b.length; }
    out[n] = y * .3;
  }
  return out;
}
const RL = reverb(VL, 0), RR = reverb(VR, 23);

let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh((L[i] + RL[i]) * 1.2); R[i] = Math.tanh((R[i] + RR[i]) * 1.2);
  if (Number.isNaN(L[i]) || Number.isNaN(R[i])) throw new Error('NaN in mix at sample ' + i);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
if (peak < 1e-4) throw new Error('mix is silent: no events?');
const gain = .7 / peak; // -3 dBFS

const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * gain * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * gain * 32767), 46 + i * 4); }
fs.writeFileSync(outFile, buf);
const counts = events.reduce((m, e) => (m[e.type] = (m[e.type] || 0) + 1, m), {});
console.log(`wrote ${outFile} · ${duration.toFixed(2)}s · ${style} ·`, Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(' '));
