---
name: collage-animate
description: Animates a surreal photo-collage video entirely in code — every piece of every scene enters on twos (drop, pop, rise, swing), idles with a hand-made boil, torn-paper wipes between scenes, word-by-word captions synced to the voiceover, synthesized paper sounds — and renders a share-ready MP4 with the installed Chrome and ffmpeg. No AI video model. Use when someone has collage scenes/layers (and usually a voiceover) and asks to animate them, "animate these in code piece by piece", or as step 5 of collage-reel.
license: MIT
---

# Collage Animate: every frame drawn in code

Your job: turn a layered collage project into a **finished MP4 that's ready to post**. A canvas page draws every frame, the Chrome already installed renders it, ffmpeg encodes it, and the sound is synthesized from the same timeline as the picture, so every hit lands where it should.

Input (format in `collage-reel/references/project-format.md`): `scenes/manifest.js` (layers + plates), `voice/voice.js` (cues + words), `style/style.js` (palette + captions). Any of them may be missing: the page falls back to sensible defaults, and with none of them it plays its built-in demo.
Output: `build/piece.html`, `build/out.mp4`, `final.mp4`, `final_sheet.png`.
Tools: this skill's `scripts/` (render, score, deliver) and `templates/collage.html` (the engine). Choreography craft: `references/choreography.md`.

## What "done" looks like
Picture someone scrolling with the sound off. In the first second something impossible is already moving: a moon falling into a field, a pyramid popping up out of clover. Each new line of the voice brings a new sheet of paper torn into view. Pieces arrive one after another with a little weight and bounce, and words appear as they're spoken. The video ends on an image that holds long enough to screenshot. If a frame would look unfinished as a still poster, it isn't done.

## Principles
- **The approved images are sacred.** When a scene has fully landed it should match the image the user approved. Motion reveals the image; it doesn't redesign it.
- **Time comes from the voice.** Scene `i` opens at `cue(i)`, and each scene's main piece lands on the strongest word of its line (word times are in `voice.json`). Don't nudge cuts by eye when a cue exists.
- **Paper physics, not camera tricks.** The frame stays still; pieces fall, pop, swing and settle. Scene changes are always the torn-paper wipe. Flashes, shakes and zooms only when something in the scene causes them.
- **Shape the energy.** Open on the strangest image, add something new in every scene, slow down for a beat before the last line, then hold the final frame at least a second after the last word.
- **Something stays.** The style's continuity element (a ground band, a sky, a recurring figure) appears in every scene and ties the video together.
- **Handmade, never smooth.** Animation steps on twos; everything has a faint 1–2 px wobble and grain; entrances are staggered, overshoot and settle; leaves and dust add secondary motion.
- **One moment per scene.** Each scene has a single small action tied to its line (`moment` in `scenes.json`): a needle swinging north, a lid dropping shut. Build it as an `fx` layer or a custom entrance.
- **Safe zones.** Captions stay 60 px inside the edges; nothing important goes in the bottom 250 px, where the app UI sits.
- **Say what you couldn't check.** You can look at frames but not listen; tell the user to play it with sound before posting.

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
