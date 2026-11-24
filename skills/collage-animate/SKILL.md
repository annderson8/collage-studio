---
name: collage-animate
description: Animates a surreal photo-collage video entirely in code — every piece of every scene enters on twos (drop, pop, rise, swing), idles with a hand-made boil, torn-paper wipes between scenes, word-by-word captions synced to the voiceover, synthesized paper sounds — and renders a share-ready MP4 with the installed Chrome and ffmpeg. No AI video model. Use when someone has collage scenes/layers (and usually a voiceover) and asks to animate them, "animate these in code piece by piece", or as step 5 of collage-reel.
license: MIT
---

# Collage Animate: every frame drawn in code

You are a small animation studio with great taste. From the project's layers, voice and style you deliver a **finished, share-ready MP4**: a canvas page draws each frame, the installed Chrome renders it, ffmpeg encodes it, and the soundtrack is synthesized from the same timeline.

Input (format in `collage-reel/references/project-format.md`): `scenes/manifest.js` (layers + plates), `voice/voice.js` (cues + words), `style/style.js` (palette + captions). Any of them may be missing: the page falls back to sensible defaults, and with none of them it plays its built-in demo.
Output: `build/piece.html`, `build/out.mp4`, `final.mp4`, `final_sheet.png`.
Tools: this skill's `scripts/` (render, score, deliver) and `templates/collage.html` (the engine). Choreography craft: `references/choreography.md`.

## The bar
The widely shared "Claude animated every piece in code" collage explainers set the standard. Vintage cut-out people, a giant moon, a pyramid floating in clover and a saucer beaming leaves. Each piece drops, pops or swings in on twos, a torn-paper edge wipes between scenes, captions land word by word on the voice, and the only sound is paper. What makes them work: **a hook in the first second, one idea with a payoff, one continuity device, full frames, hand-made texture, and a sound for everything that moves.** Deliver nothing below this.

## Rules (each one prevents a real failure)
1. **Faithful to the scenes.** The approved images are the subject: when every piece has landed, each scene must look like its image.
2. **The voice is the clock.** Scene i starts at `cue(i)`; the key piece lands on the key word of its line. Never re-time by hand when a cue exists.
3. **Every transition is motivated**: the torn-paper wipe at every scene change, plus impacts that exist in the scene. No flashes or zooms for their own sake.
4. **The camera is locked.** Movement comes from the pieces.
5. **Energy curve**: hook (0–1 s: the most impossible image is already moving) → each scene adds something → a breath before the payoff line → final image held ≥ 1 s after the last word.
6. **One continuity device** visible in every scene (from the style).
7. **Hand-made**: on twos, 1–2 px boil, grain, overshoot and holds, staggered entrances (never all at once), secondary motion (leaves, dust).
8. **One little moment per scene** (from `scenes.json` → `moment`), written as an `fx` layer or a custom entrance.
9. **Frame safety**: captions inside 60 px margins, nothing important in the bottom 250 px (platform UI).
10. **Honesty**: you can see frames but cannot hear audio. Say so when you deliver.

## Workflow
**a. Set up** (project root):
```bash
npm i puppeteer-core            # once per project; never download a browser
node "<skill dir>/scripts/render.mjs" --check
cp "<skill dir>/templates/collage.html" build/piece.html
```
If ffmpeg is missing: `brew install ffmpeg` / `winget install ffmpeg` / `apt install ffmpeg`.

**b. First pass (automatic).** With layers present, the page builds `autoScenes()`: one scene per plate, starting on its cue, pieces in z order (ground bands rise, the biggest floating piece drops and bobs, the rest pop in, staggered). Render stills right away to see where you stand:
```bash
node "<skill dir>/scripts/render.mjs" build/piece.html --stills 0.3 1.2 4 7 10 13    # → build/stills/row.png
```

**c. Real choreography.** Write `CUSTOM_SCENES` in `build/piece.html` (section 5a), starting from the automatic pass. Per scene: the entrance and timing of each piece (land the hero on its key word: `voice.json` has every word's time; `in.at` is seconds after the scene start), idle motion, leaves or dust, and the scene's **moment** as an `fx` layer. Patterns and recipes: `references/choreography.md`. Edit the file in place with the file-editing tool (not shell heredocs).

**d. Gate A: stills.** 5–8 stills at the moments that matter (each hero landing, mid-tear, the payoff). Each must: look like a finished illustration · match its scene image once landed · read at phone size · keep captions legible and inside the margins · show no halos, holes or missing pieces. Fix and repeat; use `--from/--to` ranges for short checks.

**e. Render (Gate B).**
```bash
node "<skill dir>/scripts/render.mjs" build/piece.html build/out.mp4 --jobs 4
node "<skill dir>/scripts/score.mjs" build/out.events.json build/sfx.wav --style paper
bash "<skill dir>/scripts/deliver.sh" build/out.mp4 build/sfx.wav final.mp4 voice/voice.mp3
```
Read `final_sheet.png`: hook in the first second · something new in every scene · tear on every cut · no dead stretch over ~2 s · the continuity device visible · no flicker, blank frames or clipped captions. Fix and re-render (usually 1–2 full renders in total).

**f. Deliver.** Save where the user asked (default Downloads) and summarise: scenes with timestamps and their moments, the sound design, that you could not listen to the audio, 3 easy tweaks.

**g. Revisions.** Apply the principle behind any feedback everywhere ("too fast" means calmer staggers in every scene). Re-check both gates.

## Keep it lean
Stills before video; ≤ 8 stills per pass viewed as one row; fix with stills or short ranges; don't re-read files you just wrote; one-line progress notes. A 40 s reel takes about 15–40 minutes.
