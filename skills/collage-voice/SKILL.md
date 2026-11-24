---
name: collage-voice
description: Generates the voiceover for a collage video with ElevenLabs (via Atlas Cloud), then transcribes it with word timestamps so every scene cut and caption lands exactly on the voice; outputs voice.mp3 + voice.json/voice.js. Also syncs a voice the user recorded. Use when someone needs the voice/narration/voz for a script, wants to sync their own recording, or as step 3 of collage-reel.
license: MIT
---

# Collage Voice: narration + exact timing

Input: `<project>/script/script.json` and `script.txt` (one spoken line per scene), or a recording the user provides.
Output in `<project>/voice/`: `voice.mp3`, `transcript.json`, `voice.json`, `voice.js` (format in `collage-reel/references/project-format.md`). `phrases[i]` must be script line `i`.

Scripts are in this skill's `scripts/` folder. Run them from the project root.

## Path A · ElevenLabs on Atlas Cloud (default)
1. **Text.** Join the lines of `script.json` into `voice/tts.txt`: each line on its own line, its `delivery` tag in front if any (`[whispers] What if it was a map?`). Line breaks give the natural pauses the sync relies on.
2. **Model and voice.** Default `elevenlabs/v4/text-to-speech` (`elevenlabs/v4-turbo/text-to-speech` costs half). Call `atlas_get_model_info` to read its parameters (text field, voice/voice_id options, format, speed, stability). Pick a voice that fits: warm, low and unhurried for mystery/history explainers, unless the user named one. English unless the project says otherwise.
3. **Quote, then confirm.** Call `atlas_generate_audio` without `confirmed` to get the price. Also quote the transcription (step 5) so the user approves both at once. Show model, voice and total price, then **wait for the user's OK in a new message**. Then call again with `confirmed: true`, the same arguments, the `idempotency_key` and the `confirmation_token`.
4. **Fetch.** Poll `atlas_get_prediction` until done; download the audio URL to `voice/voice.mp3` (`curl -L -o voice/voice.mp3 "<url>"`). Check the length: `ffprobe -v error -show_entries format=duration -of csv=p=0 voice/voice.mp3`. If it's far from the target, adjust the speed parameter or the script; don't stretch audio.
5. **Transcribe with word timestamps.** Upload the file: `atlas_get_upload_url`, then POST the bytes with its `curl_example`. Call `atlas_transcribe_audio` with `xai/stt-v1` (supports word-level timestamps; read its parameters with `atlas_get_model_info` and enable word timestamps), language `en`. Poll `atlas_get_prediction`; save the **raw** result JSON to `voice/transcript.json`. If the result is only a URL to a JSON file, download that file instead.
6. **Build the cues.**
   ```bash
   node "<skill dir>/scripts/voice-json.mjs" voice/transcript.json --audio voice/voice.mp3 --script script/script.txt --out voice/voice
   ```
   It aligns the script to the spoken words (STT typos never reach captions) and prints the cue table. Under 80% matched means the audio and `script.txt` differ: fix `script.txt` to what was actually said, or regenerate.

## Path B · The user recorded the voice
Copy it to `voice/voice.mp3` (`ffmpeg -i in.m4a voice/voice.mp3`). Then do steps 5–6 (transcription costs a fraction of a cent). Make `script.txt` match what was said.

## Path C · No Atlas Cloud
Estimate timing from pauses (good enough for 2–3-word captions):
```bash
node "<skill dir>/scripts/voice-sync.mjs" voice/voice.mp3 --script script/script.txt --out voice/voice
```
When the number of lines equals the number of pauses it finds, each line is cut exactly. It needs a clean voice (no music bed). For a draft voice on macOS: `say -v Samantha -o /tmp/v.aiff "$(cat script/script.txt)" && ffmpeg -i /tmp/v.aiff voice/voice.mp3`.

## Check and show
Show the cue table (`cue(i)  start–end  line`), the total length, and the cost. Remind the user you can't hear audio: they should listen to `voice/voice.mp3`. A badly read line is cheaper to redo now than after the scenes.
