# Collage Studio: surreal collage reels, animated by Claude in code

Six Claude skills that turn **a style reference and a topic** into a finished vertical video. Claude writes the script, ElevenLabs v4 reads it with emotion (in your own cloned voice if you want), the scene images are generated and split into layers, and every frame is drawn in code: pieces drop and pop in on twos, torn paper wipes between scenes, and captions land word by word on the voice. **No AI video model.**

<p align="center"><img src="docs/demo.gif" width="240" alt="Demo reel on aged graph paper: a telephone grows out of a sheet of paper, a man with a paper-tape spool for a head, a cipher machine whose keys fly away, a marble bust with a clockwork face, an empty chair under the rain and a hand touching a TV screen, each in front of a giant red circle, with torn-paper wipes and word-by-word captions"></p>
<p align="center"><sub><b>Alan Turing in 30 seconds</b>, made end to end with these skills: Spanish narration in the author's cloned voice (ElevenLabs v4 with emotions), 6 scenes generated and split on Atlas Cloud, every frame drawn in code. Total cost ≈ $1.72.<br><a href="docs/demo.mp4">MP4 with sound</a> · <a href="examples/alan-turing">How it was made</a> · <a href="README.es.md">Español</a></sub></p>
<p align="center"><img src="docs/stills.jpg" width="720" alt="Six stills from the Alan Turing reel"></p>

## The pipeline

```
 style reference ──► 1 collage-style ──► style/       palette, caption font, motion, image prompt
 topic ────────────► 2 collage-script ─► script/      hook + one line per scene, each with a visual twist
                     3 collage-voice ──► voice/       ElevenLabs v4 voice with emotions + word timings
                     4 collage-scenes ─► scenes/      generated scenes → background + one layer per piece
                     5 collage-animate ► final.mp4    every frame drawn in code, synced, paper sounds
           ★ collage-reel runs 1→5 and stops for your OK before anything costs money
```

| Skill | What it does | Runs on |
|---|---|---|
| **collage-reel** | Producer: runs the whole pipeline, resumes half-done projects, asks before every paid step | — |
| **collage-style** | Reads 1–3 reference images and writes a style bible: palette with roles, caption typography, motion rhythm, continuity device, a reusable image prompt | Claude (free) |
| **collage-script** | Hook, one spoken line per scene with its emotion, an *impossible image* and one animated moment per line, facts checked | Claude + web search |
| **collage-voice** | ElevenLabs v4 voiceover with an emotion tag per line, in any voice of your account (your clone included), timed from its pauses: exact cut per line, words pinned to the breaths inside each line. Also syncs your own recording | ElevenLabs connector (your plan's characters); Atlas Cloud as fallback |
| **collage-scenes** | Plans which model makes each scene, generates them, and splits each into a clean background + transparent layers (Seedream Layer Decomposition, or background removal + cut-outs), then finds where each layer belongs | Atlas Cloud (≈ $0.25–0.70 per scene) or Higgsfield (credits) |
| **collage-animate** | Choreographs each piece (drop, pop, rise, swing, flutter), torn-paper wipes, word captions, paper sound design; renders the MP4 | Your machine (free) |

Each skill reads and writes one shared [project folder](skills/collage-reel/references/project-format.md), so you can run them together or one at a time (only voice, only animation from your own images, etc.).

## Install

**Claude Code (plugin)**
```
/plugin marketplace add annderson8/collage-studio
/plugin install collage-studio@collage-studio
```

Installed as a plugin, the skills carry the plugin name in front: `/collage-studio:collage-reel`, `/collage-studio:collage-voice`… Copied by hand they have no prefix (`/collage-reel`); the examples below use the plugin names.

**Claude Code (manual)**
```bash
git clone https://github.com/annderson8/collage-studio
cp -r collage-studio/skills/* ~/.claude/skills/
```

**Claude.ai / Desktop chat**: paste the `/plugin marketplace add …` line in the chat, or upload the zips from [Releases](../../releases) under *Settings → Capabilities → Skills*. It works, but the code runs in a cloud sandbox with closed network, so you'll be asked to allow each domain it downloads from (Atlas, ElevenLabs, npm).

**Recommended: Claude Code in an empty folder.** Create a folder, open it in VS Code (or the terminal, or the *Code* tab of the desktop app) and run `/collage-studio:collage-reel` there. Everything runs on your machine, the project lands in that folder, and on the first run the producer offers to write a `.claude/settings.local.json` that allows the Atlas/ElevenLabs tools and `node`/`ffmpeg`/`curl`, so you're not asked to approve every image. Spending still waits for your OK.

**Requirements**
- Node ≥ 18, ffmpeg, an installed Chrome / Edge / Chromium. The skills install `puppeteer-core` (a few MB) in the project folder and never download a browser.
- The **ElevenLabs** connector for the voice (v4, emotions, your cloned voice).
- **Atlas Cloud** or **Higgsfield** for the scene images (Atlas also does the layer split and can stand in for the voice with library voices).
- Without them: record the voice yourself (synced from its pauses) and bring your own scene images (cut out locally).

## Use it

```
/collage-studio:collage-reel
A 30-second reel in Spanish: who Alan Turing was and what he did. Use my cloned voice and the style of this image.
[attach 1–3 reference images]
```
Claude shows you the style, then the script (you approve), then the voice and scene quotes (you approve the price), then the scenes (you approve), and delivers `final.mp4` with a contact sheet and what was spent.

Or one step at a time:
```
/collage-studio:collage-script   Script about how bees navigate by the sun, 30 s
/collage-studio:collage-voice    Generate the voice for this project with my cloned voice
/collage-studio:collage-animate  Animate these scenes piece by piece, synced to voice.mp3
```

## Series: same look, lower cost
Keep the reels of one series side by side in one folder (`historians/tesla`, `historians/ada-lovelace`…). From the second reel on, the producer notices its siblings and offers to reuse their style, language and voice. After the first reel it can also build a **series kit** (`_kit/`), for free, from that reel's layers: the giant circle, geometry lines, small red shapes and newspaper scraps, cut once. New scenes are then generated without them and the animation adds them back, so the layer split (≈ 75% of the Atlas bill) returns about half the layers.

Measured on the same series (10 scenes, ≈ 46 s each): Hedy Lamarr without a kit, 124 layers and $3.02 on Atlas ($2.23 of it the split); Grace Hopper with the kit, 48 layers and $1.76 ($1.04 the split). That is 53% less on the split and 42% less in total, with the same look.

## Under the hood

All scripts are plain Node + ffmpeg; the only package is `puppeteer-core`.

| Script | Skill | What it does |
|---|---|---|
| `voice-sync.mjs` | voice | Times a voice from its pauses (auto threshold): one exact cut per script line, word boundaries pinned to micro-pauses |
| `voice-json.mjs` | voice | Aligns any word-timestamped transcript (Whisper, Seed ASR, Scribe…) to the script: exact words, STT typos never reach captions |
| `layers-import.mjs` | scenes | Takes the decomposition's cropped, rescaled layers and finds each one's scale, position and stacking order by matching it against the scene, including flat shapes and pieces partly hidden behind others |
| `layers-check.mjs` | scenes | Rebuilds each scene from its layers next to the original, one labelled box per layer, to catch a misplaced piece before animating |
| `kit-build.mjs` | scenes | Builds a series kit from a finished reel's layers: decorations reused by every later reel instead of being generated and split again |
| `cutout.mjs` | scenes | Local fallback: colour-key or mask cut-outs plus a rebuilt background plate |
| `render.mjs` | animate | Renders the canvas page through your browser: stills, ranges, `--jobs N` parallel, environment check |
| `score.mjs` | animate | Synthesizes torn paper, thuds, pops, swishes and leaf flutters on the exact event times of the picture |
| `deliver.sh` | animate | Mixes voice + effects, -14 LUFS for social, contact sheet for review |

And [`templates/collage.html`](skills/collage-animate/templates/collage.html), the animation engine: paper textures, glued-on cut-out sprites, entrances, idle boil, flutter particles, torn-paper wipes, captions, and an automatic first pass that animates any layered project. Opened with no project it plays a short code-drawn demo in the same graph-paper style.

The [`examples/alan-turing`](examples/alan-turing) folder has every text file behind the demo reel: style bible, script with sources, voice text with emotion tags and word timings, the six scene prompts and the final choreography.

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
- The 30 s demo cost $1.64 on Atlas Cloud (6 scenes at $0.07 + layer splits at $0.16–0.29 each) plus 458 characters of an ElevenLabs plan. A 40–45 s reel with 8–10 scenes lands around $2–4, or the equivalent in Higgsfield credits; every price is shown and confirmed first. Measured on a 50 s, 10-scene reel: ≈ 850 ElevenLabs credits for the voice (about $0.15) and $2.45–2.93 on Atlas Cloud (most of it, ≈ $2.1–2.2, is the layer split).
- It takes time: 45–60 minutes for a 50 s reel, most of it generating and splitting scenes and you reviewing them.

## License
[MIT](LICENSE) © 2026 Annderson Rey
