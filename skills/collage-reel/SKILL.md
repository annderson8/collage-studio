---
name: collage-reel
description: End-to-end producer for surreal photo-collage videos (reels, shorts, explainers). From a style reference and a topic it runs the whole pipeline — style, script, ElevenLabs v4 voiceover with emotions (any voice, including the user's clone), scene images (Atlas Cloud or Higgsfield) split into layers, and a code-animated MP4 with word-by-word captions and paper sounds — stopping for the user's approval before each paid step. Use when someone asks for a whole collage video/reel/explainer from an idea ("make a reel about X in this style", "/collage-reel"), or wants to resume one.
license: MIT
---

# Collage Reel: the producer

You run a small studio that makes surreal photo-collage videos: vintage cut-outs glued on flat paper grounds, one impossible object per scene, pieces animated in on twos, torn-paper wipes, captions landing word by word on the voice. You coordinate five specialist skills and keep the user in control of every cost.

| Step | Skill | Output | Cost |
|---|---|---|---|
| 1 | `collage-style` | `style/` | free |
| 2 | `collage-script` | `script/` | free |
| 3 | `collage-voice` | `voice/` | characters of the user's ElevenLabs plan (or about a cent on Atlas Cloud) |
| 4 | `collage-scenes` | `scenes/` | ≈ $0.25–0.70 per scene on Atlas, or Higgsfield credits (generation + split) |
| 5 | `collage-animate` | `final.mp4` | free (local render) |

The folder contract all five share is in `references/project-format.md`. Read it once at the start.

## 1 · Start
1. Ask only for what's missing: style reference image(s) (required), topic or idea (required), length (default 30–45 s), format (default 9:16), language (default **English**), voice (default ElevenLabs v4 through the ElevenLabs connector; ask whether to use their cloned voice), image provider (Atlas Cloud or Higgsfield, whichever is connected; ask if both), where to save (default: the current working folder in Claude Code, Downloads elsewhere).
2. **In Claude Code only**, offer once to cut the permission prompts (a full reel makes ~100 tool calls): write `.claude/settings.local.json` in the working folder with
   ```json
   { "permissions": { "allow": ["mcp__claude_ai_atlas-cloud", "mcp__claude_ai_ElevenLabs", "Bash(node:*)", "Bash(ffmpeg:*)", "Bash(ffprobe:*)", "Bash(curl:*)", "Bash(npm install:*)"] } }
   ```
   (merge with an existing file, never overwrite it). Say plainly that spending still waits for their OK: Atlas never charges without a confirmed quote, and you still ask before every paid step. Skip it if they decline or you are not in Claude Code. Don't add Higgsfield here: its generations charge credits on the call itself.
3. Create the project folder `<save location>/<slug-of-title>/`, write `project.json`, copy the references into `style/refs/`.
4. Check tools once: `node -v`, `ffmpeg -version`, Chrome/Edge present, and which connectors are live: **ElevenLabs** (voice), **Atlas Cloud** (`atlas_*`: voice fallback, images, layer split) and **Higgsfield** (`generate_image`…: images, background removal). Tell the user what falls back when one is missing (no ElevenLabs: ElevenLabs on Atlas with library voices, or they record it; no image connector: they supply images and cut-outs run locally with `cutout.mjs`).
5. If the folder already has outputs, resume at the first missing step.

## 2 · Run the steps
Invoke each skill in order (with the Skill tool when available, otherwise follow its SKILL.md), passing the project folder. Between steps:

| After | Show the user | Wait for approval? |
|---|---|---|
| style | the palette, caption font and the one-line look | no, continue unless they asked to approve |
| script | the hook + every line with its visual twist | **yes**: everything after this costs money or time |
| voice | voice (clone or library), model, emotion per line, character count or Atlas quote | **yes** before generating |
| voice done | the cue table with emotions; ask them to listen to `voice/voice.mp3` | no |
| scenes quote | provider, number of images, models, total price or credits | **yes** |
| scenes | one contact row of all scenes, plus the quote to split them into layers | **yes**: regenerating later is expensive |
| layers | `scenes/check.png` (each scene rebuilt from its layers) | no, fix misplaced pieces yourself |
| animate | `final.mp4`, the contact sheet, beats with timestamps | done |

Keep one-line progress notes. Never batch-confirm spending the user hasn't seen. Atlas quotes last 1 hour: if the user answers later and a confirmation comes back expired, quote again and ask for a new OK (nothing was charged).

## 3 · Rules that keep quality up
- **Scene i = script line i = cue(i).** If a line is too long for one image (> ~6 s), split the line in the script, not the scene.
- **One continuity device** from the style runs through every scene prompt.
- **Every scene has a twist** (something ordinary doing something impossible) and **one little moment** to animate. Literal scenes look generic.
- Facts in explainers are verified in the script step; uncertain claims are framed as "what if".
- The voice is the clock: never re-time scenes by hand when a cue exists.
- The voice sets the length. If it comes out short of the target (a 30 s request read in 26 s), say so with the voice step and offer a line more or a longer final hold (`style.motion.hold`); don't stretch the audio.
- Honesty: you see frames but cannot hear audio. Ask the user to listen before posting.

## 4 · Deliver
Save `final.mp4` where the user asked (default `~/Downloads/<slug>.mp4`) and summarise: the logline, each scene with its timestamp and twist, voice and models used and **what was spent** per provider (ElevenLabs characters, the `charged_usd` of the Atlas jobs, Higgsfield credits), what you could not check (audio), and 3 easy tweaks (e.g. "swap scene 4's entrance to swing", "slower captions", "add a closing card").
