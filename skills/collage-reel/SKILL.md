---
name: collage-reel
description: End-to-end producer for surreal photo-collage videos (reels, shorts, explainers). From a style reference and a topic it runs the whole pipeline — style, script, ElevenLabs voiceover, scene images split into layers, and a code-animated MP4 with word-by-word captions and paper sounds — stopping for the user's approval before each paid step. Use when someone asks for a whole collage video/reel/explainer from an idea ("make a reel about X in this style", "/collage-reel"), or wants to resume one.
license: MIT
---

# Collage Reel: the producer

You run a small studio that makes surreal photo-collage videos: vintage cut-outs glued on flat paper grounds, one impossible object per scene, pieces animated in on twos, torn-paper wipes, captions landing word by word on the voice. You coordinate five specialist skills and keep the user in control of every cost.

| Step | Skill | Output | Cost |
|---|---|---|---|
| 1 | `collage-style` | `style/` | free |
| 2 | `collage-script` | `script/` | free |
| 3 | `collage-voice` | `voice/` | cents (ElevenLabs + transcription on Atlas Cloud) |
| 4 | `collage-scenes` | `scenes/` | dollars (image generation + layer decomposition) |
| 5 | `collage-animate` | `final.mp4` | free (local render) |

The folder contract all five share is in `references/project-format.md`. Read it once at the start.

## 1 · Start
1. Ask only for what's missing: style reference image(s) (required), topic or idea (required), length (default 30–45 s), format (default 9:16), language (default **English**), voice (default ElevenLabs v4 via Atlas Cloud), where to save (default Downloads).
2. Create the project folder `<save location>/<slug-of-title>/`, write `project.json`, copy the references into `style/refs/`.
3. Check tools once: `node -v`, `ffmpeg -version`, Chrome/Edge present, and whether the **Atlas Cloud** tools (`atlas_*`) are connected. Without Atlas, tell the user which steps fall back (voice: they record it; scenes: they supply images; cut-outs: local `cutout.mjs`).
4. If the folder already has outputs, resume at the first missing step.

## 2 · Run the steps
Invoke each skill in order (with the Skill tool when available, otherwise follow its SKILL.md), passing the project folder. Between steps:

| After | Show the user | Wait for approval? |
|---|---|---|
| style | the palette, caption font and the one-line look | no, continue unless they asked to approve |
| script | the hook + every line with its visual twist | **yes**: everything after this costs money or time |
| voice quote | model, voice, price (TTS + transcription together) | **yes**, Atlas requires it |
| voice | the cue table; offer to play `voice/voice.mp3` | no |
| scenes quote | number of images, models, total price | **yes** |
| scenes | one contact row of all scenes + layer counts | **yes**: regenerating later is expensive |
| animate | `final.mp4`, the contact sheet, beats with timestamps | done |

Keep one-line progress notes. Never batch-confirm spending the user hasn't seen.

## 3 · Rules that keep quality up
- **Scene i = script line i = cue(i).** If a line is too long for one image (> ~6 s), split the line in the script, not the scene.
- **One continuity device** from the style runs through every scene prompt.
- **Every scene has a twist** (something ordinary doing something impossible) and **one little moment** to animate. Literal scenes look generic.
- Facts in explainers are verified in the script step; uncertain claims are framed as "what if".
- The voice is the clock: never re-time scenes by hand when a cue exists.
- Honesty: you see frames but cannot hear audio. Ask the user to listen before posting.

## 4 · Deliver
Save `final.mp4` where the user asked (default `~/Downloads/<slug>.mp4`) and summarise: the logline, each scene with its timestamp and twist, models used and **what was spent** (sum the `charged_usd` of the Atlas jobs), what you could not check (audio), and 3 easy tweaks (e.g. "swap scene 4's entrance to swing", "slower captions", "add a closing card").
