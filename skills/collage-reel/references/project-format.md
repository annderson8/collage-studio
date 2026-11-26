# Project folder format (shared by every collage-* skill)

One folder per video. Each skill reads what the previous one wrote and writes only its own folder, so any skill can run alone when its inputs exist.

```
<project>/
  project.json                 {"title", "topic", "format": "9:16", "lang": "en", "target_seconds": 40}
  style/
    refs/                      the user's reference images (copied here)
    style.md                   human-readable style bible
    style.json                 machine-readable (schema below)
    style.js                   window.STYLE = <style.json>   (read by the video page)
  script/
    script.md                  the script with beats, twists and sources
    script.json                {"title", "lines": [{"text", "delivery", "twist", "moment", "pieces"}]}
    script.txt                 one line per scene, exactly as spoken, no tags (used for sync)
  voice/
    tts.txt                    the text sent to ElevenLabs: each line with its emotion tags in front
    voice.mp3                  the voiceover
    transcript.json            raw speech-to-text output with word timestamps
    voice.json / voice.js      {duration, phrases[i] = line i, words[]}  →  window.VOICE
  scenes/
    scenes.json                the plan: per scene id, prompt, model, pieces, moment
    01.png 02.png …            one image per script line (scene i ↔ line i ↔ cue(i))
    layers/01/base.png         clean background
    layers/01/<piece>.png      one transparent PNG per moving piece (trimmed)
    layers/01/raw/             original layer files as downloaded
    layers/01/check.png        the scene next to its rebuild from the layers (layers-check.mjs); scenes/check.png = all
    manifest.json / manifest.js  →  window.CUTOUTS {"01_circle": {...}}, window.PLATES {"01": ...}
  build/
    piece.html                 the animation (copied from collage-animate/templates/collage.html)
    stills/                    look-dev stills + row.png
    out.mp4, out.events.json, sfx.wav
  final.mp4, final_sheet.png
  node_modules/                puppeteer-core (npm i puppeteer-core in the project root)
```

## Series (several reels in one look)
```
<series>/
  _kit/                        decorations cut once, shared by every reel (collage-scenes/scripts/kit-build.mjs)
    kit.json                   {"format", "pieces": {"circle1": {file, kind, w, h, x, y, from}}}  (w/h/x/y in video px)
    kit.js                     window.KIT  (read by build/piece.html as ../../_kit/kit.js)
    circle1.png news1.png …    kinds: backdrop (circle*), lines (lines*, arc*), scrap (news*), accent (sq*, tri*…)
  <reel-a>/  <reel-b>/ …       ordinary project folders, side by side
```
A reel in a series reuses a sibling's `style/`. Its scenes are generated **without** the kit's decorations; the video page adds them to every scene that has no backdrop of its own (no layer named circle/ring/disc/sun), as sprites `kit_<name>`.

## Rules
- Scene ids are two-digit strings: `01`, `02`, … Scene `01` is script line 0 and voice `cue(0)`.
- All paths inside JSON are relative to the project root.
- Run every script from the project root: `node "<skill dir>/scripts/x.mjs" ...`.
- Never overwrite another skill's folder; to redo a step, rerun that skill.

## style.json schema
```json
{
  "name": "Graph-paper science collage",
  "format": "9:16",
  "palette": { "paper": "#e1dcc4", "grid": "#9ccfcf", "red": "#d35245", "ink": "#1e1d1b", "capActive": "#d35245", "capPast": "#1e1d1b", "capEdge": "#efe9d6" },
  "palette_roles": { "#e1dcc4": "aged graph-paper ground", "#d35245": "giant circle, small squares and triangles, active caption word" },
  "texture": "aged cream graph paper with a teal grid; black-and-white halftone cut-outs with faint drop shadows",
  "captions": { "font": "Space Mono", "weight": 700, "size": 72, "y": 220, "maxWords": 3, "uppercase": true, "edge": 12 },
  "motion": { "fps": 24, "on_twos": true, "scene_seconds": [3, 6], "transition": "torn paper wipe", "entrances": ["pop", "drop", "rise", "swing"], "hold": 1.2 },
  "sound": "paper only, no music",
  "continuity": "a giant flat red circle behind the hero, thin black geometry lines and small red squares in every scene",
  "prompt": "Vertical 9:16 surreal vintage photo collage on aged cream graph paper ... Keep the top 15% of the frame as plain graph paper ... no text.",
  "avoid": ["text in images", "colour photos", "3D render look", "crowded overlapping pieces"]
}
```
`palette` keys `capActive`, `capPast`, `capEdge`, every `captions` key and `motion.hold` (seconds the last frame holds after the voice, default 1.2) are read by the video page; the rest guides the other skills. The full file of the demo reel is in the repository at `examples/alan-turing/style/style.json`.
