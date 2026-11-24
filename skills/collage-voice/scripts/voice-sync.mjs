#!/usr/bin/env node
// voice-sync: turn a voiceover into cue points so the picture cuts on the voice.
//
//   node voice-sync.mjs voice.mp3                          speech phrases from pauses only
//   node voice-sync.mjs voice.mp3 --script script.txt      + word timings estimated from the script text
//   node voice-sync.mjs voice.mp3 --transcript t.json      + timings from a transcript
//        t.json: [{start,end,text}] segments, optionally with words:[{word,start,end}] (whisper style)
//   options: --noise auto|-32dB  --min-silence 0.28  --out voice   (writes voice.js + voice.json)
//
// Output: window.VOICE = {duration, phrases:[{start,end,text}], words:[{w,start,end}]}
// Phrase i is the i-th line the picture should cut on: in the page use cue(i, fallbackSeconds).

import fs from 'fs';
import { spawnSync } from 'child_process';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const noiseOpt = opt('--noise', 'auto'), minSil = +opt('--min-silence', '0.28'), outBase = opt('--out', 'voice');
const scriptFile = opt('--script'), trFile = opt('--transcript');
const audio = argv[0];
if (!audio) { console.error('usage: node voice-sync.mjs voice.mp3 [--script script.txt | --transcript t.json]'); process.exit(2); }

// 1. silences → speech segments. "auto" sets the threshold from the mean loudness and raises it
//    until real pauses appear (needed when the voice sits on music or room noise).
const ff = args => (spawnSync('ffmpeg', ['-hide_banner', '-i', audio, ...args, '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '');
function detect(db) {
  const log = ff(['-af', `silencedetect=noise=${db}dB:d=${minSil}`]);
  const dm = log.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!dm) { console.error('could not read audio duration:\n' + log.slice(-800)); process.exit(1); }
  const duration = +dm[1] * 3600 + +dm[2] * 60 + +dm[3];
  const sil = []; let s0 = null;
  for (const line of log.split('\n')) {
    const a = line.match(/silence_start: (-?[\d.]+)/), b = line.match(/silence_end: ([\d.]+)/);
    if (a) s0 = Math.max(0, +a[1]);
    if (b) { sil.push([s0 ?? 0, +b[1]]); s0 = null; }
  }
  if (s0 !== null) sil.push([s0, duration]);
  const speech = []; let cur = 0;
  for (const [a, b] of sil) { if (a - cur > 0.05) speech.push([cur, a]); cur = b; }
  if (duration - cur > 0.05) speech.push([cur, duration]);
  return { duration, speech };
}
let threshold, det;
if (noiseOpt === 'auto') {
  const mean = +((ff(['-af', 'volumedetect']).match(/mean_volume: (-?[\d.]+)/) || [])[1] ?? -30);
  for (let off = 12; off >= 0; off -= 2) {       // from well below the mean upwards
    threshold = Math.round(mean - off); det = detect(threshold);
    const covered = det.speech.reduce((t, [a, b]) => t + b - a, 0) / det.duration;
    if (det.speech.length >= Math.max(2, det.duration / 6) && covered > 0.45) break;
  }
} else { threshold = parseFloat(noiseOpt); det = detect(threshold); }
const { duration, speech } = det;
const speechTotal = speech.reduce((t, [a, b]) => t + b - a, 0);

// map a fraction of the spoken time (0..1) to a real time, skipping the pauses
const speechTime = q => {
  let left = clamp(q) * speechTotal;
  for (const [a, b] of speech) { if (left <= b - a) return a + left; left -= b - a; }
  return speech.length ? speech[speech.length - 1][1] : 0;
};
function clamp(v) { return Math.max(0, Math.min(1, v)); }
const snap = t => { // snap a phrase start to the nearest speech onset if close
  let best = t; for (const [a] of speech) if (Math.abs(a - t) < 0.4 && Math.abs(a - t) < Math.abs(best - t) + 1e-9) best = a; return best;
};
const weight = w => Math.max(1, w.replace(/[^\p{L}\p{N}]/gu, '').length) + 1.5;   // rough spoken length

let phrases = [], words = [];

function fromText(text, t0, t1, withPhrases) {     // spread words across [t0,t1] (or all speech) by length
  const lines = text.replace(/\r/g, '').split(/(?<=[.!?…;:])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  const all = lines.flatMap((l, li) => l.split(/\s+/).map(w => ({ w, li })));
  const tot = all.reduce((t, x) => t + weight(x.w), 0); let acc = 0;
  const map = q => t0 == null ? speechTime(q) : t0 + q * (t1 - t0);
  const ws = all.map(x => { const a = acc / tot; acc += weight(x.w); return { w: x.w, li: x.li, start: +map(a).toFixed(3), end: +map(acc / tot).toFixed(3) }; });
  if (withPhrases) lines.forEach((l, li) => {
    const lw = ws.filter(x => x.li === li); phrases.push({ start: +snap(lw[0].start).toFixed(3), end: lw[lw.length - 1].end, text: l });
  });
  return ws.map(({ w, start, end }) => ({ w, start, end }));
}

if (trFile) {
  const tr = JSON.parse(fs.readFileSync(trFile, 'utf8'));
  const segs = Array.isArray(tr) ? tr : (tr.segments || []);
  for (const s of segs) {
    phrases.push({ start: +(+s.start).toFixed(3), end: +(+s.end).toFixed(3), text: (s.text || '').trim() });
    if (s.words && s.words.length) words.push(...s.words.map(w => ({ w: (w.word || w.text || '').trim(), start: +(+w.start).toFixed(3), end: +(+w.end).toFixed(3) })));
    else words.push(...fromText(s.text || '', +s.start, +s.end, false));
  }
} else if (scriptFile) {
  const text = fs.readFileSync(scriptFile, 'utf8');
  const lines = text.replace(/\r/g, '').split(/(?<=[.!?…;:])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  if (lines.length === speech.length) {            // one line per spoken segment: exact phrase sync
    lines.forEach((l, i) => { phrases.push({ start: +speech[i][0].toFixed(3), end: +speech[i][1].toFixed(3), text: l }); words.push(...fromText(l, ...speech[i], false)); });
  } else words = fromText(text, null, null, true);
} else {
  phrases = speech.map(([a, b]) => ({ start: +a.toFixed(3), end: +b.toFixed(3), text: '' }));
}

const VOICE = { duration: +duration.toFixed(3), source: audio, phrases, words, speech: speech.map(([a, b]) => [+a.toFixed(3), +b.toFixed(3)]) };
fs.writeFileSync(outBase + '.json', JSON.stringify(VOICE, null, 1));
fs.writeFileSync(outBase + '.js', 'window.VOICE = ' + JSON.stringify(VOICE) + ';\n');

console.log(`${audio}: ${duration.toFixed(2)}s · threshold ${threshold}dB · ${speech.length} speech segments · ${phrases.length} phrases · ${words.length} words`);
phrases.forEach((p, i) => console.log(`  cue(${i})`.padEnd(10), `${p.start.toFixed(2)}–${p.end.toFixed(2)}s`, p.text.slice(0, 60)));
console.log(`wrote ${outBase}.js and ${outBase}.json`);
if (scriptFile) console.log('Word times are estimated from text length between pauses; use --transcript with word timestamps for exact sync.');
