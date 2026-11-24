---
name: collage-voice
description: Generates the voiceover for a collage video with ElevenLabs (via Atlas Cloud) and times it — exact scene cuts from the pauses between lines, word timings pinned to the micro-pauses inside them (or exact from any word-timestamp transcript) — so captions and cuts land on the voice; outputs voice.mp3 + voice.json/voice.js. Also syncs a voice the user recorded. Use when someone needs the voice/narration/voz for a script, wants to sync their own recording, or as step 3 of collage-reel.
license: MIT
---

# Collage Voice: narration + exact timing

Input: `<project>/script/script.json` and `script.txt` (one spoken line per scene), or a recording the user provides.
Output in `<project>/voice/`: `voice.mp3`, `transcript.json`, `voice.json`, `voice.js` (format in `collage-reel/references/project-format.md`). `phrases[i]` must be script line `i`.

Scripts are in this skill's `scripts/` folder. Run them from the project root.

## Path A · ElevenLabs on Atlas Cloud (default)
1. **Text.** Join the lines of `script.json` into `voice/tts.txt`: each line on its own line, its `delivery` tag in front if any (`[whispers] What if it was a map?`). Line breaks give the natural pauses the sync relies on.
2. **Model and voice.** Default `elevenlabs/v4/text-to-speech` (`elevenlabs/v4-turbo/text-to-speech` costs half). Call `atlas_get_model_info` to read its parameters (text field, voice/voice_id options, format, speed, stability). Pick a voice that fits: warm, low and unhurried for mystery/history explainers, unless the user named one. English unless the project says otherwise.
3. **Quote, then confirm.** Call `atlas_generate_audio` with `{"text": "<tts.txt>"}` (plus voice settings from the schema) and without `confirmed` to get the price (≈ $0.008 for two lines, tested). Point the user to the Atlas quote card, then **wait for their OK** (on the card or in a new message). Then call again with `confirmed: true`, the same arguments, the `idempotency_key` and the `confirmation_token`.
4. **Fetch.** Poll `atlas_get_prediction` until done; download the audio URL to `voice/voice.mp3` (`curl -L -o voice/voice.mp3 "<url>"`). Check the length: `ffprobe -v error -show_entries format=duration -of csv=p=0 voice/voice.mp3`. If it's far from the target, adjust the speed parameter or the script; don't stretch audio.
5. **Build the cues.** A generated voice is clean and pauses at every line break, so the pauses give exact scene cuts and the short pauses inside each line pin the word timings:
   ```bash
   node "<skill dir>/scripts/voice-sync.mjs" voice/voice.mp3 --script script/script.txt --out voice/voice
   ```
   Check the printout says `N speech segments · N phrases` with N = number of script lines (each line then cuts exactly). If the counts differ, a line break didn't produce a pause: add a comma-free break or split the TTS call per line and join the files with ~0.5 s of silence (`ffmpeg -f concat`).
6. **Transcript check (optional, ≈ $0.0002).** Transcription on Atlas returns **text only** (no word timestamps through the connector, tested), so use it only to confirm the voice said the script: upload `voice/voice.mp3` (`atlas_get_upload_url` + its `curl_example`), call `atlas_transcribe_audio` with `xai/stt-v1` and params `{"audio": "asset://<asset_id>", "language": "en"}` (the field is `audio`, not `audio_url`), compare the text with `script.txt`.

`scripts/voice-json.mjs` turns any transcript **with** word timestamps (local Whisper `--word_timestamps True`, an STT API called directly, ElevenLabs Scribe…) into exact word timing; prefer it when you have one:
```bash
node "<skill dir>/scripts/voice-json.mjs" voice/transcript.json --audio voice/voice.mp3 --script script/script.txt --out voice/voice
```

## Path B · The user recorded the voice
Copy it to `voice/voice.mp3` (`ffmpeg -i in.m4a voice/voice.mp3`). Make `script.txt` match what was said, then build the cues with `voice-sync.mjs` (step 5). A human recording has fewer clean pauses: if the segment count doesn't match the lines, use a word-timestamp transcript with `voice-json.mjs`.

## Path C · No Atlas Cloud
Estimate timing from pauses (good enough for 2–3-word captions):
```bash
node "<skill dir>/scripts/voice-sync.mjs" voice/voice.mp3 --script script/script.txt --out voice/voice
```
When the number of lines equals the number of pauses it finds, each line is cut exactly. It needs a clean voice (no music bed). For a draft voice on macOS: `say -v Samantha -o /tmp/v.aiff "$(cat script/script.txt)" && ffmpeg -i /tmp/v.aiff voice/voice.mp3`.

## Check and show
Show the cue table (`cue(i)  start–end  line`), the total length, and the cost. Remind the user you can't hear audio: they should listen to `voice/voice.mp3`. A badly read line is cheaper to redo now than after the scenes.
