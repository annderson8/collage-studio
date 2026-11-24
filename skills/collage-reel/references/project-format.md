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
    tts.txt                    the text sent to the TTS model (may contain delivery tags)
    voice.mp3                  the voiceover
    transcript.json            raw speech-to-text output with word timestamps
    voice.json / voice.js      {duration, phrases[i] = line i, words[]}  →  window.VOICE
  scenes/
    scenes.json                the plan: per scene id, prompt, model, pieces, moment
    01.png 02.png …            one image per script line (scene i ↔ line i ↔ cue(i))
    layers/01/base.png         clean background
    layers/01/<piece>.png      one transparent PNG per moving piece (trimmed)
    layers/01/raw/             original layer files as downloaded
    manifest.json / manifest.js  →  window.CUTOUTS {"01_moon": {...}}, window.PLATES {"01": ...}
  build/
    piece.html                 the animation (copied from collage-animate/templates/collage.html)
    stills/                    look-dev stills + row.png
    out.mp4, out.events.json, sfx.wav
  final.mp4, final_sheet.png
  node_modules/                puppeteer-core (npm i puppeteer-core in the project root)
```

## Rules
- Scene ids are two-digit strings: `01`, `02`, … Scene `01` is script line 0 and voice `cue(0)`.
- All paths inside JSON are relative to the project root.
- Run every script from the project root: `node "<skill dir>/scripts/x.mjs" ...`.
- Never overwrite another skill's folder; to redo a step, rerun that skill.

## style.json schema
```json
{
  "name": "Surreal vintage collage",
  "format": "9:16",
  "palette": { "paper": "#f2ecdd", "sky": "#8fb4bf", "capActive": "#b4402c", "capPast": "#77736b", "capEdge": "#f2ecdd" },
  "palette_roles": { "#8fb4bf": "flat sky ground", "#b4402c": "active caption word" },
  "texture": "visible paper grain, soft drop shadows under every cut-out",
  "captions": { "font": "Courier Prime", "weight": 700, "size": 74, "y": 230, "maxWords": 3, "uppercase": true, "edge": 12 },
  "motion": { "fps": 24, "on_twos": true, "scene_seconds": [3, 6], "transition": "torn paper wipe", "entrances": ["rise", "drop", "pop", "swing"] },
  "sound": "paper only, no music",
  "continuity": "a band of clover with cream flowers along the bottom of every scene",
  "prompt": "Vertical 9:16 surreal vintage photo collage. Cut-out black-and-white vintage photographs ... no text.",
  "avoid": ["text in images", "3D render look", "busy backgrounds behind pieces"]
}
```
`palette` keys `capActive`, `capPast`, `capEdge` and every `captions` key are read by the video page; the rest guides the other skills.
