# Motion Studio: a Claude skill that animates every frame in code

**No AI video model.** Claude draws every frame in JavaScript on a canvas, renders it with the Chrome already on your machine, cuts it on your voiceover and scores it with paper sounds it synthesizes itself. You get a finished, share-ready MP4.

<p align="center"><img src="docs/demo.gif" width="240" alt="Demo: a moon drops onto a clover field, a pyramid pops in, a saucer beams leaves up, with torn-paper wipes and word-by-word captions"></p>
<p align="center"><sub>The template's built-in demo: 100% procedural, rendered by <code>render.mjs</code>. <a href="docs/demo.mp4">MP4 with sound</a> · <a href="README.es.md">Español</a></sub></p>

## What it makes

| Mode | You give Claude | You get |
|---|---|---|
| **Collage explainer** | Surreal collage scenes (or a style + an idea, and an image tool generates them) and a voiceover | Each piece cut out and animated in on twos, torn-paper wipes between scenes, word-by-word captions synced to the voice, and paper-only sound |
| **Drawn piece** | Reference images/videos + a rough idea | A hand-made animation in the *look* of the references (ink, riso, watercolour, engraving...), with a full synthesized score |

Formats: 9:16 reels/shorts, 1:1, 4:5, 16:9 · 24 fps on twos or 30 fps.

## Install

**Claude Code (plugin)**
```
/plugin marketplace add annderson8/motion-studio
/plugin install motion-studio@motion-studio
```

**Claude Code (manual)**: copy the skill folder into your skills directory:
```bash
git clone https://github.com/annderson8/motion-studio
cp -r motion-studio/skills/motion-studio ~/.claude/skills/
```

**Claude.ai / Claude Desktop**: download `motion-studio.zip` from the [Releases](../../releases) page, or build it with `npm run zip`, then upload it under *Settings → Capabilities → Skills*. Rendering needs a machine with Chrome and ffmpeg, so Claude Code or Desktop with local tools works best.

**Requirements**: Node ≥ 18, ffmpeg, and an installed Chrome / Edge / Chromium. The skill installs `puppeteer-core` (a few MB) in the project folder and never downloads a browser.

## Use it

```
/motion-studio
Animate these scenes in code, piece by piece, synced to my voiceover.
[attach scene images + voice.mp3]
```
```
/motion-studio
Explainer: what if the last pharaoh was an alien? Generate 8 vertical scenes in the style
of these references, then animate them synced to my voiceover.
[attach 2 style references + voice.mp3]   ← needs an image-generation MCP (e.g. Higgsfield)
```
```
/motion-studio
A 15 s 9:16 piece about how a seed becomes a forest, in the look of these risograph prints.
```

## How it works

```
references ─► STYLE.md ─► CONCEPT.md ─┐
voice.mp3 ──► voice-sync.mjs ─► voice.js ─┤
scenes ─────► cutout.mjs ─► cutouts/ ─────┼─► piece.html ─► render.mjs ─► out.mp4 + events.json
                                          │   (pure render(f))              │
                                          └────────────────────────────── score.mjs ─► sfx.wav
                                                                  deliver.sh ─► final.mp4 (-14 LUFS)
```

Claude works in two quality gates: **stills first** (a contact row of key frames must look like finished illustrations) and then **motion** (a contact sheet of the render: hook, rising energy, motivated transitions, no dead stretches).

<p align="center"><img src="docs/stills.jpg" width="540" alt="Contact row of three stills from the demo"></p>

## The scripts

All in [`skills/motion-studio/scripts/`](skills/motion-studio/scripts). Plain Node plus ffmpeg; the only package is `puppeteer-core`.

| Script | What it does |
|---|---|
| `render.mjs` | Renders `piece.html` to MP4 through the installed browser. `--stills` for look-dev, `--from/--to` for ranges, `--jobs N` for parallel renders, `--check` for an environment report. Exports `window.EVENTS` for the sound. |
| `voice-sync.mjs` | Finds the pauses in a voiceover (auto threshold) and returns cue points + word timings from a script or a whisper-style transcript. |
| `cutout.mjs` | Cuts pieces out of a collage (colour key or an external mask), remembers where they sat, and rebuilds the background plate behind them. |
| `score.mjs` | Synthesizes a sound for every event: torn paper, thuds, pops, swishes, leaf flutters, risers, bells, plus an optional pad. Reverb, soft-clip, NaN/silence guards. |
| `deliver.sh` | Mixes picture + effects (+ voice), normalises to -14 LUFS for social, writes a review contact sheet. |

And [`templates/collage.html`](skills/motion-studio/templates/collage.html): a working collage engine with paper textures, glued-on cut-out sprites, entrances (`rise`, `drop`, `pop`, `swing`, `slide`, `fade`), idle bob and boil, flutter particles, torn-paper wipes and word-by-word captions. Open it in a browser for a live preview.

## Repository layout

```
skills/motion-studio/
  SKILL.md                      the skill: modes, rules, workflow, quality gates
  references/
    collage-explainer.md        collage mode: pipeline, choreography, captions, sound
    scene-prompts.md            generating scenes with an image tool
    recipes.md                  drawing recipes for drawn mode + extending the score
  scripts/                      render, voice-sync, cutout, score, deliver
  templates/collage.html        the collage engine (also the demo)
.claude-plugin/                 plugin + marketplace manifests
test/smoke.sh                   end-to-end test of every script (npm test)
docs/                           demo media
```

## Development

```bash
npm install && npm test     # runs every script end to end (needs Chrome + ffmpeg)
npm run zip                 # builds motion-studio.zip for Claude.ai upload
```
CI runs the same smoke test on Ubuntu on every push.

## Honest limits
- Claude can look at frames but cannot hear audio: it tells you so, and you should listen before posting.
- Collage pieces on busy backgrounds need a mask from a background-removal tool; big holes in detailed backgrounds look best with an image model's "remove the object" edit as the plate.
- Word timings from `--script` are estimated inside each spoken line. Use a transcript with word timestamps for exact per-word sync.
- A 15 s piece takes roughly 20–60 minutes of Claude's work, most of it on look-dev.

## Credits
The collage-explainer mode was inspired by the "Claude animates every piece in code" workflow shared in short-form tutorials by AI motion creators in 2026. The engine, scripts and demo in this repository are original work released under the MIT License.

## License
[MIT](LICENSE) © 2026 Annderson Rey
