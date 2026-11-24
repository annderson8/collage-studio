---
name: collage-style
description: Reads 1–3 reference images (or video frames) and writes a reusable style bible for surreal photo-collage videos — palette with roles, textures, caption typography, motion rhythm, sound, continuity device and an image-generation prompt fragment — as style.md + style.json + style.js. Use when someone shares a style reference for a collage video, asks "take the style from this image", or as step 1 of collage-reel.
license: MIT
---

# Collage Style: the style bible

Input: reference images in `<project>/style/refs/` (or paths the user gives; copy them there). Video references: pull frames first:
```bash
ffmpeg -i ref.mp4 -vf "fps=1/1.5,scale=320:-1,tile=5x4" -frames:v 1 style/refs/ref_sheet.png
```
Output: `style/style.md`, `style/style.json`, `style/style.js` (format in `collage-reel/references/project-format.md`).

## 1 · Look closely
View each reference whole, then crop 2–3 details at full size (texture and edges live there):
```bash
ffmpeg -i style/refs/a.jpg -vf "crop=iw/3:ih/3:iw/3:ih/3" -frames:v 1 /tmp/detail.png
```
Note, for each: grounds (flat colour? paper? photo?), how pieces are cut (clean edge, white border, torn), shadows, photo treatment of people (sepia, b/w, halftone), scale play, density, where the eye goes, any type.

Sample real colours instead of guessing (6–10 swatches):
```bash
ffmpeg -i style/refs/a.jpg -vf "scale=8:8:flags=area" -f rawvideo -pix_fmt rgb24 - | xxd -p -c 3 | sort | uniq -c | sort -rn | head
```

## 2 · Write style.json
Follow the schema in the project-format reference. Decide:
- **palette** with roles. Pick caption colours that read on the grounds: `capActive` (one strong accent, e.g. brick red), `capPast` (warm grey), `capEdge` (the paper colour, as an outline). When the accent is also the continuity device's colour (red words, red circle), say in `prompt` that the top 15% of the frame stays plain ground so the two never overlap.
- **captions.font**: a Google Fonts family that matches the references' type or era (typewriter: Courier Prime, Special Elite; editorial serif: Cormorant Garamond, EB Garamond; grotesk: Archivo Black). Size 64–84 px for 1080 wide; y ≈ 230 (top band) unless the references put text elsewhere; keep it out of the bottom 250 px.
- **motion**: always on twos at 24 fps; scene length 3–6 s; transition (torn paper by default; ink bleed or a slide only if the references suggest it); preferred entrances.
- **sound**: paper only, unless the references are loud (then `paper+music`).
- **continuity**: one element that can live in every scene (a ground band, a sky colour, a recurring figure).
- **prompt**: one paragraph an image model can reuse for every scene. Describe the *look*, never a specific scene: medium, grounds, cut-out treatment, shadows, grain, palette words, composition rules, "clean separated elements with clear edges", "no text". End with: "Match the style of the reference images exactly."
- **avoid**: what would break the look (text in images, glossy 3D, busy backgrounds behind pieces, modern objects if the refs are vintage).

Write `style/style.js` as `window.STYLE = <the same JSON>;`.

## 3 · Write style.md (for humans)
A short page: the look in one paragraph, the palette table (hex, role), caption sample (font, colours), motion and sound notes, the continuity device, the prompt fragment, the avoid list, and a **do-not-copy list** (the exact subjects in the references; scenes must be new).

## 4 · Show
Tell the user the look in one line, the palette and the caption font. Continue unless they asked to approve.
