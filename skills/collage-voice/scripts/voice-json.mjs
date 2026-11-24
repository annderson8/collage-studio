#!/usr/bin/env node
// voice-json.mjs: turn a speech-to-text result with word timestamps into the cue file the video uses.
//
//   node voice-json.mjs voice/transcript.json --audio voice/voice.mp3 --script script/script.txt [--out voice/voice]
//
// transcript.json: the raw STT output saved as-is (xAI STT, Seed ASR, Whisper, ElevenLabs...). Any shape works
// if it contains word objects with a text field (word|text|token) and start/end times (start|start_time|begin,
// end|end_time), in seconds or milliseconds.
// script.txt: one line per scene, exactly as spoken (no delivery tags). Line i becomes cue(i) in the video.
//
// Output voice.json + voice.js: {duration, phrases:[{start,end,text}], words:[{w,start,end}], source:"stt"}
// Words keep the timing of the audio and the spelling of the script (STT typos never reach the captions).

import fs from 'fs';
import { spawnSync } from 'child_process';

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const audio = opt('--audio'), scriptFile = opt('--script'), outBase = opt('--out', 'voice/voice');
const trFile = argv[0];
if (!trFile || !scriptFile) { console.error('usage: node voice-json.mjs transcript.json --script script.txt [--audio voice.mp3] [--out voice/voice]'); process.exit(2); }

// 1. collect word objects anywhere in the JSON
const raw = JSON.parse(fs.readFileSync(trFile, 'utf8'));
const pick = (o, ks) => { for (const k of ks) if (o[k] !== undefined && o[k] !== null) return o[k]; };
const found = [];
(function walk(o) {
  if (Array.isArray(o)) return o.forEach(walk);
  if (!o || typeof o !== 'object') return;
  const t = pick(o, ['word', 'text', 'token', 'punctuated_word']), s = pick(o, ['start', 'start_time', 'begin', 'startTime', 'start_ms']), e = pick(o, ['end', 'end_time', 'stop', 'endTime', 'end_ms']);
  const isWord = typeof t === 'string' && s !== undefined && e !== undefined && t.trim().split(/\s+/).length <= 2;
  if (isWord && typeof o.type === 'string' && o.type !== 'word') return;   // ElevenLabs Scribe: skip spacing and (laughs)-style audio events
  if (isWord) { found.push({ t: t.trim(), s: +s, e: +e, ms: 'start_ms' in o }); return; }
  Object.values(o).forEach(walk);
})(raw);
if (!found.length) { console.error('no word-level timestamps found in ' + trFile + '. Ask the STT model for word timestamps, or use voice-sync.mjs.'); process.exit(1); }

let duration = 0;
if (audio) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio], { encoding: 'utf8' });
  duration = parseFloat(r.stdout) || 0;
}
const maxEnd = Math.max(...found.map(w => w.e));
const inMs = found.some(w => w.ms) || (duration ? maxEnd > duration * 5 : maxEnd > 600);
const words = found.filter(w => w.t && !/^[\p{P}\s]+$/u.test(w.t) && !/^\[[^\]]*\]$/.test(w.t))   // drop punctuation and [audio tags]
  .map(w => ({ t: w.t, s: inMs ? w.s / 1000 : w.s, e: inMs ? w.e / 1000 : w.e })).sort((a, b) => a.s - b.s);
if (!duration) duration = words[words.length - 1].e + 0.3;

// 2. align script words to spoken words (tolerant to STT typos, skipped or extra words)
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
const lines = fs.readFileSync(scriptFile, 'utf8').split(/\r?\n/).map(l => l.replace(/\[[^\]]*\]/g, '').trim()).filter(Boolean);
const sw = lines.flatMap((l, li) => l.split(/\s+/).filter(w => norm(w)).map(w => ({ w, li, n: norm(w) })));
const tw = words.map(w => ({ ...w, n: norm(w.t) }));
const map = new Array(sw.length).fill(-1);
const close = (a, b) => a === b || (a.length > 3 && b.length > 3 && (a.startsWith(b) || b.startsWith(a) || lev(a, b) <= Math.floor(Math.max(a.length, b.length) / 4)));
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] !== b[j - 1])); return d[a.length][b.length]; }
let j = 0;
for (let i = 0; i < sw.length && j < tw.length; i++) {
  let k = -1;
  for (let a = j; a < Math.min(tw.length, j + 6); a++) if (close(sw[i].n, tw[a].n)) { k = a; break; }
  if (k >= 0) { map[i] = k; j = k + 1; }
}
// unmatched script words: interpolate between matched neighbours
const timeOf = i => map[i] >= 0 ? tw[map[i]] : null;
const out = sw.map((x, i) => {
  const t = timeOf(i); if (t) return { w: x.w, li: x.li, start: t.s, end: t.e };
  let p = i - 1; while (p >= 0 && map[p] < 0) p--; let n = i + 1; while (n < sw.length && map[n] < 0) n++;
  const a = p >= 0 ? tw[map[p]].e : 0, b = n < sw.length ? tw[map[n]].s : duration, k = (i - p) / (n - p);
  return { w: x.w, li: x.li, start: a + (b - a) * k * .98, end: a + (b - a) * Math.min(1, k + 1 / (n - p)) * .98, guessed: true };
});
const matched = map.filter(m => m >= 0).length / sw.length;

const r3 = v => +v.toFixed(3);
const phrases = lines.map((text, li) => { const ws = out.filter(w => w.li === li); return { start: r3(ws[0].start), end: r3(ws[ws.length - 1].end), text }; });
const VOICE = { duration: r3(duration), source: 'stt', phrases, words: out.map(w => ({ w: w.w, start: r3(w.start), end: r3(w.end) })) };
fs.writeFileSync(outBase + '.json', JSON.stringify(VOICE, null, 1));
fs.writeFileSync(outBase + '.js', 'window.VOICE = ' + JSON.stringify(VOICE) + ';\n');

console.log(`${words.length} spoken words · ${sw.length} script words · ${(matched * 100).toFixed(0)}% matched · ${duration.toFixed(2)}s${inMs ? ' (ms input)' : ''}`);
phrases.forEach((p, i) => console.log(`  cue(${i})`.padEnd(10), `${p.start.toFixed(2)}–${p.end.toFixed(2)}s`, p.text.slice(0, 60)));
console.log(`wrote ${outBase}.js and ${outBase}.json`);
if (matched < .8) console.warn('warning: under 80% of the script matched the audio. Is script.txt exactly what was spoken?');
