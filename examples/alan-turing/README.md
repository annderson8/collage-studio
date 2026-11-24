# Example: Alan Turing in 30 seconds

The demo reel in the main README ([MP4 with sound](../../docs/demo.mp4)), made with one request:

```
/collage-reel
A 30-second reel in Spanish: a short summary of who Alan Turing was and what he did.
Use my ElevenLabs voice and generate the images with Atlas. Follow the style I'm attaching.
[one reference image: aged graph paper, a big red circle, black-and-white halftone cut-outs]
```

<p align="center"><img src="scenes/row.jpg" width="720" alt="The six generated scenes side by side"></p>

## What each step produced

| Step | Files here | Notes |
|---|---|---|
| Style | [`style/style.json`](style/style.json), [`style.md`](style/style.md) | Palette with roles, Space Mono captions (active word in red), the red circle as the continuity device, the image prompt. The reference image is not included. |
| Script | [`script/script.json`](script/script.json), [`script.md`](script/script.md) (with sources), [`script.txt`](script/script.txt) | 6 lines, 69 words, one emotion per line: curious → warmly → serious → curious/softly → sad/softly → warmly. |
| Voice | [`voice/tts.txt`](voice/tts.txt), [`voice/voice.json`](voice/voice.json) | ElevenLabs v4 with a cloned voice (Spanish, Colombian accent), one take, 26.0 s. Word times come from ElevenLabs Scribe aligned with `voice-json.mjs` (100% matched). The audio itself is only in the demo MP4. |
| Scenes | [`scenes/prompts.json`](scenes/prompts.json) | Seedream 5.0 Pro edit, the reference image as input, 1584×2816. Each scene was then split with Seedream 5.0 Flash Layer Decomposition into 8–15 layers and placed with `layers-import.mjs`. |
| Animation | [`build/choreography.js`](build/choreography.js) | The `CUSTOM_SCENES` block: every hero lands on its key word, the red circle always pops in first (never drops through the captions), the last frame holds 2 s. |

## Cost

| Provider | What | Spent |
|---|---|---|
| ElevenLabs | 458 characters of voice, Scribe transcription | ≈ $0.08 of a Creator plan |
| Atlas Cloud | 6 scenes × $0.072 | $0.43 |
| Atlas Cloud | 6 layer splits ($0.16–0.29 each, by layer count) | $1.21 |
| Your machine | Animation, sound design, render (28 s, 1080×1920) | free |

## Reproduce it

Copy this folder as a new project, add your own reference image to `style/refs/`, and ask for the steps you want to redo, for example:

```
/collage-voice    Generate the voice for this project with my cloned voice
/collage-scenes   Generate and split the scenes for this project
/collage-animate  Animate it; start from build/choreography.js
```

New scenes split into different layers, so the piece keys in `choreography.js` (`01_layer_8` …) must be matched to your new `scenes/manifest.js`.
