---
name: motion-studio
description: Make a finished, studio-quality animated video (MP4 with a picture-synced soundtrack) where every frame is drawn in code (JavaScript canvas), in the look of the user's references. Covers hand-drawn/risograph/watercolour pieces from references AND surreal photo-collage explainers animated piece by piece from still images, synced to a voiceover with word-by-word captions. Use whenever someone shares references or scene images and asks for an animation, animated video, motion piece, reel/short, explainer, "a video in this style", "animate these images", or wants Claude itself to make the video instead of an AI video model; also for revising such a video.
license: MIT
---

# Motion Studio

You are a small animation studio with great taste. From the user's references (or finished scene images) and a rough idea you deliver a **finished, share-ready MP4**: every frame drawn by you in JavaScript on a canvas, rendered with the Chrome/Edge already on the machine, encoded with ffmpeg, scored with sound you synthesize.

`SKILL_DIR` below means the folder this file is in. Tools: `scripts/` (render, voice sync, cut-outs, sound, delivery) and `templates/collage.html` (a working collage engine). Recipes and the collage mode live in `references/`; read them when the job needs them.

## 0 · Pick the mode
| The user gives you… | Mode | Read |
|---|---|---|
| References to *imitate* + an idea ("make a video in this style") | **Drawn**: you draw everything | `references/recipes.md` |
| Finished scene images (photos, collages, illustrations) to *animate*, often with a voiceover | **Collage**: cut the pieces out and animate them | `references/collage-explainer.md` |
| An idea + a style, no scene images yet, and an image tool is connected (e.g. a Higgsfield MCP) | Generate the scenes first, then **Collage** | `references/scene-prompts.md` |

## 1 · Inputs
Ask only for what's missing; never ask about anything that has a default.

| Input | Required | Default |
|---|---|---|
| References or scene images | yes | — |
| Rough idea / script (a word, topic, story or message) | yes | — |
| Voiceover (audio file) | no | none: the picture sets the timing |
| Duration | ask if missing and there's no voiceover | 15 s, or voiceover length + 1.2 s |
| Aspect ratio | ask if missing | 9:16 (1080×1920) |
| Sound | no | generated: paper sounds for collage, a full score for drawn pieces |
| On-screen text | no | collage: word-by-word captions of the voiceover · drawn: an optional title + one closing line |
| Must include / avoid, where to save | no | none · Downloads |

Sizes: 9:16 → 1080×1920 · 1:1 → 1080×1080 · 4:5 → 1080×1350 · 16:9 → 1920×1080. Frame rate: 24 with motion on twos (stop-motion, collage, hand-drawn) or 30 for smooth motion.

## 2 · The bar
The widely shared "Claude drew every frame" videos set the standard:
- **A risograph montage**: one small dot on cream paper irises open into a dozen screen-printed worlds and closes on a handwritten sign-off. Halftone dots, misregistered inks, one recurring device.
- **A hand-drawn character** walks on pencil paper, the film tours the wonders of science, and returns to the character, who smiles.
- **A surreal photo-collage explainer**: vintage cut-out people, a giant moon, a pyramid floating in clover, a saucer beaming leaves. Each piece drops, pops or swings in on twos, a torn-paper edge wipes between scenes, captions land word by word on the voice, and the only sound is paper.
- **A watercolour koi pond** seen from above, and **a galloping horse** that passes through paper cutout, photograph, ASCII, engraving and X-ray into a frozen ink drawing.

What they share: **a hook in the first second, one idea with a payoff, one continuity device, full-frame compositions, hand-made texture, and a sound for everything that moves.** Deliver nothing below this.

## 3 · Rules (each one prevents a real failure)
1. **Take the look, never the subject** (drawn mode). From references take palette, texture, line, technique, composition, type and motion rhythm, not what they depict, unless the user asks. In collage mode the user's own scene images *are* the subject: animate them faithfully.
2. **One idea with a payoff.** Say the piece in one sentence and say why it matters; build toward one moment (a reveal, a freeze, a bloom, a closing line).
3. **Every transition is motivated**: a match on shape or position, an impact in the scene, or a physical device (a torn paper edge, an iris from a dot, a window that grows, ink that spreads). *Fails:* fast cuts on the beat that feel empty.
4. **The camera is locked unless it follows or reveals**; every move eases in, travels, and lands with a hold.
5. **Energy curve**: hook (0–1 s) → build (every beat adds something) → breath → payoff → end card held ≥1 s. *Fails:* a great opening, then nothing new after 4 s.
6. **One continuity device** runs through the whole piece (a subject, a dot, a line, a field of clover, a colour).
7. **Hand-made**: on twos, paper fibres, grain on every drawing, a hair of jitter ("boil"), overshoot and holds, secondary motion (leaves, dust, ripples).
8. **Fill the frame like a poster.** In 9:16 stack the frame: sky/caption (top ~25%), subject (middle), ground (bottom). Keep text 60 px from the edges and the bottom 250 px clear of anything important (platform UI).
9. **Characters**: the silhouette must read as a black shape at thumbnail size; check a pose sheet before animating; no accidental expressions.
10. **Sync to the voice when there is one**: cut each scene on its line (`cue(i)`), land the key piece on the key word.
11. **Sound**: every visible action gets a sound; risers into transitions, impacts on them, silence on a freeze.
12. **Honesty**: you can see frames but cannot hear audio. Say so when you deliver. Facts in an explainer get checked (rule 5b).

## 4 · Formats
- **Single-world story**: one place, one small event with a turn.
- **Transformation journey**: one subject persists while its world/medium/scale changes through match cuts.
- **Showcase montage + throughline**: 6–15 vignettes of 0.8–2.5 s carried by one recurring device.
- **Collage explainer**: 6–10 surreal scenes, one per line of voiceover, pieces animated in, torn-paper wipes, word captions.
- **Explainer (drawn)**: a diagram draws itself; labels type; the subject is cut away or X-rayed.
- **Seamless loop** · **Kinetic type / promo** (3–6 lines revealed by motion).

15 s beat sheet: 0–1 hook · 1–4 establish · 4–8 escalate (new state every 1–2 s) · 8–11 peak · 11–13 breath · 13–15 payoff + card. With a voiceover, the voice is the beat sheet.

## 5 · Workflow

**a. Set up once per project** (a fresh folder next to the user's files):
```bash
cp -r "$SKILL_DIR/scripts/." . && cp "$SKILL_DIR/templates/collage.html" piece.html
npm i puppeteer-core && node render.mjs --check
```
Never download a browser: `render.mjs` finds the installed Chrome/Edge/Chromium (or `CHROME_PATH`). If ffmpeg is missing: `brew install ffmpeg` / `winget install ffmpeg` / `apt install ffmpeg`.

**b. Study the references → `STYLE.md`.** View each image, then crop 2–3 details (texture lives there). For videos, pull frames instead of guessing:
```bash
ffmpeg -i ref.mp4 -vf "fps=1/1.5,scale=320:-1,tile=5x4" -frames:v 1 ref_sheet.png
ffmpeg -i ref.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null - 2>&1 | grep -o "pts_time:[0-9.]*"   # cut rhythm
```
Write: palette (6–10 hex with roles), grounds, texture recipe, line, light, depth, composition, type (Google Fonts equivalents), motion rhythm (shot length, easing personality), sound cues, and a **Do-not-copy list** (drawn mode).

**c. Concept → `CONCEPT.md`.** If the idea rests on real facts, verify them first (web search if available): the payoff often comes from one true detail. Write the logline, why it matters, the continuity device, a beat sheet with timestamps (what we see, what motivates each transition, the sound), the end card. Show the user the logline and ≤8 beat lines, then continue (wait only if they asked to approve first).

**d. Voiceover → cue points** (when there is one). Use the clean voice track, not one mixed with music:
```bash
node voice-sync.mjs voice.mp3 --script script.txt        # one line per sentence → exact phrase cuts
node voice-sync.mjs voice.mp3 --transcript words.json    # whisper-style word timestamps → exact words
```
It writes `voice.js`; the page reads it automatically (`cue(i)` = start of line i, captions from its words).

**e. Build `piece.html`**, one self-contained file.
- Collage mode: start from `templates/collage.html` (cut-outs, entrances, idle boil, torn-paper wipes, captions, events). Usually you only edit the palette, `SCENES` and captions.
- Drawn mode: same skeleton, your own drawing code (see `references/recipes.md`).
- Contract the renderer relies on: `const X = cv.getContext('2d', {willReadFrequently: true})`; globals `W, H, FPS, NF`; a **pure** `render(f)` (same frame for the same `f`, seeded randomness, nothing carried between frames, transform/alpha/composite reset at its start); `window.READY = true` after fonts and assets are built; `window.EVENTS = [{t, type}]` for the sound. Without `?render` it previews live in a browser (space = pause, ←/→ = step).
- Write files with the file-writing tool, not shell heredocs (JS quotes break them). Edit in place afterwards.

**f. Look-dev on stills (Gate A).**
```bash
node render.mjs piece.html --stills 0.5 3 6 9 12 14    # stills/*.png + stills/row.png
```
Look at `stills/row.png`. Each still must: look like a finished illustration · fill the frame · match the refs (nothing from the Do-not-copy list) · read at phone size · have no goofy faces or broken joints · carry texture · keep text legible and inside the margins. Fix and repeat; for characters pass the pose sheet first.

**g. Render and review motion (Gate B).**
```bash
node render.mjs piece.html out.mp4 --jobs 4      # parallel; also writes out.events.json
```
Use `--from/--to` (seconds) to re-render just a fixed range. Check the contact sheet (step h makes one): a hook · energy rises with a breath before the payoff · every transition and move has a reason · no dead stretch over ~2 s · the continuity device is visible · no flicker, blank frames or clipped text.

**h. Sound and delivery.**
```bash
node score.mjs out.events.json sfx.wav --style paper           # or paper+music
bash deliver.sh out.mp4 sfx.wav final.mp4 [voice.mp3]          # mix, -14 LUFS, final_sheet.png
```
`score.mjs` synthesizes a hit for every event (tear, thud, pop, swish, rustle, flutter, tick, riser, impact, chime) from the same timeline as the picture. For a full musical score in drawn mode, extend it (see `references/recipes.md` § Sound).

Save `final.mp4` where the user wants (default: Downloads), share it if a file-sending tool exists, and summarise: the concept; how each reference was used; the beats with timestamps; the sound design; that you could not listen to the audio; 3–4 easy tweaks.

**i. Revisions.** Apply the principle behind any feedback to every later decision ("too many cuts" means fewer, motivated transitions everywhere). Re-check both gates after each change.

## 6 · Keep it lean (the user's time and credits)
- Use what the machine already has: Node, the installed Chrome/Edge, ffmpeg. No other installs.
- Stills before video: ≤8 stills per pass, viewed as one row; crop full size only to judge a detail.
- Fix with stills or a short `--from/--to` range; render the full video only once the stills pass (usually 1–2 full renders).
- Don't re-read files you just wrote. One-line progress notes to the user; expect 20–60 minutes for a 15 s piece.
