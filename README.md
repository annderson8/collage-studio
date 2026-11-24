# Collage Studio: surreal collage reels, animated by Claude in code

Six Claude skills that turn **a style reference and a topic** into a finished vertical video. Claude writes the script, ElevenLabs reads it, the scene images are generated and split into layers, and every frame is drawn in code: pieces drop and pop in on twos, torn paper wipes between scenes, and captions land word by word on the voice. **No AI video model.**

<p align="center"><img src="docs/demo.gif" width="240" alt="Demo: a moon drops onto a clover field, a pyramid pops in, a saucer beams leaves up, with torn-paper wipes and word-by-word captions"></p>
<p align="center"><sub>The animation engine's built-in demo (100% procedural). <a href="docs/demo.mp4">MP4 with sound</a> · <a href="README.es.md">Español</a></sub></p>

## The pipeline

```
 style reference ──► 1 collage-style ──► style/       palette, caption font, motion, image prompt
 topic ────────────► 2 collage-script ─► script/      hook + one line per scene, each with a visual twist
                     3 collage-voice ──► voice/       ElevenLabs voiceover + word-level timestamps
                     4 collage-scenes ─► scenes/      generated scenes → background + one layer per piece
                     5 collage-animate ► final.mp4    every frame drawn in code, synced, paper sounds
           ★ collage-reel runs 1→5 and stops for your OK before anything costs money
```

| Skill | What it does | Runs on |
|---|---|---|
| **collage-reel** | Producer: runs the whole pipeline, resumes half-done projects, asks before every paid step | — |
| **collage-style** | Reads 1–3 reference images and writes a style bible: palette with roles, caption typography, motion rhythm, continuity device, a reusable image prompt | Claude (free) |
| **collage-script** | Hook, one spoken line per scene, an *impossible image* and one animated moment per line, facts checked | Claude + web search |
| **collage-voice** | ElevenLabs v4 voiceover, timed from its pauses: exact cut per line, words pinned to the breaths inside each line. Also syncs your own recording | Atlas Cloud (≈ $0.01) |
| **collage-scenes** | Plans which model makes each scene, generates them, and splits each into a clean background + transparent layers (Seedream Layer Decomposition), then finds where each layer belongs | Atlas Cloud (≈ $0.25–0.70 per scene) |
| **collage-animate** | Choreographs each piece (drop, pop, rise, swing, flutter), torn-paper wipes, word captions, paper sound design; renders the MP4 | Your machine (free) |

Each skill reads and writes one shared [project folder](skills/collage-reel/references/project-format.md), so you can run them together or one at a time (only voice, only animation from your own images, etc.).

## Install

**Claude Code (plugin)**
```
/plugin marketplace add annderson8/collage-studio
/plugin install collage-studio@collage-studio
```

**Claude Code (manual)**
```bash
git clone https://github.com/annderson8/collage-studio
cp -r collage-studio/skills/* ~/.claude/skills/
```

**Claude.ai / Desktop**: upload the zips from [Releases](../../releases) (or `npm run zip` → `dist/`) under *Settings → Capabilities → Skills*. Rendering needs local Chrome + ffmpeg, so Claude Code or Desktop with local tools works best.

**Requirements**
- Node ≥ 18, ffmpeg, an installed Chrome / Edge / Chromium. The skills install `puppeteer-core` (a few MB) in the project folder and never download a browser.
- The **Atlas Cloud** connector for voice and image generation. Without it: record the voice yourself (synced from its pauses) and bring your own scene images (cut out locally).

## Use it

```
/collage-reel
A 40-second reel: what if the last pharaoh was an alien? Use the style of these images.
[attach 1–3 reference images]
```
Claude shows you the style, then the script (you approve), then the voice and scene quotes (you approve the price), then the scenes (you approve), and delivers `final.mp4` with a contact sheet and what was spent.

Or one step at a time:
```
/collage-script   Script about how bees navigate by the sun, 30 s
/collage-voice    Generate the voice for this project with a calm narrator
/collage-animate  Animate these scenes piece by piece, synced to voice.mp3
```

## Under the hood

All scripts are plain Node + ffmpeg; the only package is `puppeteer-core`.

| Script | Skill | What it does |
|---|---|---|
| `voice-sync.mjs` | voice | Times a voice from its pauses (auto threshold): one exact cut per script line, word boundaries pinned to micro-pauses |
| `voice-json.mjs` | voice | Aligns any word-timestamped transcript (Whisper, Seed ASR, Scribe…) to the script: exact words, STT typos never reach captions |
| `layers-import.mjs` | scenes | Takes the decomposition's cropped, rescaled layers and finds each one's scale, position and stacking order by matching it against the scene |
| `cutout.mjs` | scenes | Local fallback: colour-key or mask cut-outs plus a rebuilt background plate |
| `render.mjs` | animate | Renders the canvas page through your browser: stills, ranges, `--jobs N` parallel, environment check |
| `score.mjs` | animate | Synthesizes torn paper, thuds, pops, swishes and leaf flutters on the exact event times of the picture |
| `deliver.sh` | animate | Mixes voice + effects, -14 LUFS for social, contact sheet for review |

And [`templates/collage.html`](skills/collage-animate/templates/collage.html), the animation engine: paper textures, glued-on cut-out sprites, entrances, idle boil, flutter particles, torn-paper wipes, captions, and an automatic first pass that animates any layered project.

## Development
```bash
npm install && npm test     # end-to-end on a synthetic project (needs Chrome + ffmpeg, no API calls)
npm run zip                 # dist/<skill>.zip for Claude.ai upload
claude plugin validate .
```
CI runs the smoke test on Ubuntu on every push.

## Honest limits
- Claude sees frames but cannot hear audio: listen before posting.
- Image models drift. The scenes step shows you all scenes side by side before splitting, and regenerates only the ones that fail.
- Layer decomposition is excellent on separated pieces and weaker on crowded ones; prompts ask for space around every piece for that reason.
- A 40 s reel costs roughly $3–6 on Atlas Cloud (8 scenes + layers + voice); every price is shown and confirmed first.

## License
[MIT](LICENSE) © 2026 Annderson Rey
