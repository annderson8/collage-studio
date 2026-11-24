---
name: collage-script
description: Writes the script for a short surreal photo-collage video (reel, short, explainer) — a scroll-stopping hook, one spoken line per scene, each paired with an impossible visual twist and one animated moment, facts verified — as script.md + script.json + script.txt ready for voice and scene generation. Use when someone asks for a script/guion for a collage video or explainer, or as step 2 of collage-reel.
license: MIT
---

# Collage Script: one line, one impossible image

Input: the topic/idea, target length, language (default **English**), and `style/style.json` if it exists (for the continuity device).
Output in `<project>/script/`: `script.md`, `script.json`, `script.txt` (format in `collage-reel/references/project-format.md`).

## 1 · Research first when facts are involved
History, science, nature or "how X works": verify every claim with web search before writing; keep 1–3 sources per fact in `script.md`. The best payoff is usually **one true, surprising detail** (e.g. the Great Pyramid is aligned to true north within a tenth of a degree). Speculation is framed as a question ("What if…?"), never as fact.

## 2 · Shape
- **Length**: ~2.5 spoken words per second. 30 s ≈ 75 words, 45 s ≈ 110 words.
- **Lines**: one line per scene, 6–16 words (≈ 2.5–6 s). 6–10 lines for 30–45 s.
- **Arc**: hook (line 1, ≤ 8 words, the strangest claim or question) → context → escalation (each line adds something) → the true detail → the turn ("What if…") → payoff line that lands on a short, quotable phrase.
- **Spoken English**: short words, concrete nouns, no parentheses or lists, numbers as people say them. Read it aloud in your head; cut anything that trips.
- Optional ElevenLabs delivery tags per line (`[whispers]`, `[curious]`, `[dramatic pause]`): put them in `delivery`, never in `text`.

## 3 · A twist for every line
For each line write:
- **twist**: the impossible image. Something ordinary doing something impossible: a lemon is the sun, a hand reaches out of a painting, a pyramid floats on clover, a saucer beams leaves. Literal illustration ("pyramid + UFO") is a fail.
- **moment**: the one thing that moves to make the line land (the compass needle swings to north; the mask's lid drops into place; a constellation draws itself upward).
- **pieces**: 2–5 separable elements an image can be split into (the big object, each figure or group, foreground band, a prop). Keep them few and clearly separated.
Every scene carries the style's continuity device.

## 4 · Write the files
`script.json`:
```json
{ "title": "The Pharaoh Who Came Home", "lang": "en", "target_seconds": 40,
  "lines": [ { "text": "Ancient Egyptians believed their pharaohs never died.", "delivery": "",
               "twist": "three Egyptians in a clover field gaze at a giant moon that hangs low like a lantern",
               "moment": "the moon drops in and bobs; clover leaves float up", "pieces": ["moon", "three figures", "clover band"] } ] }
```
`script.txt`: the `text` of each line, one per line, nothing else. `script.md`: logline, why it matters, the table (#, line, twist, moment), sources.

## 5 · Show and wait
Show the hook and every line with its twist (a compact table). **Wait for approval**: voice and images cost money and depend on this text. Apply edits to the files, then continue.
