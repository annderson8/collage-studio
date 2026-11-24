---
name: collage-voice
description: Generates the voiceover for a collage video with ElevenLabs v4 through the ElevenLabs connector (any voice of the account, including the user's own cloned voice), with an emotion tag on every line, and times it — exact scene cuts from the pauses between lines, word timings pinned to the micro-pauses inside them (or exact from a word-timestamp transcript) — so captions and cuts land on the voice; outputs voice.mp3 + voice.json/voice.js. Falls back to ElevenLabs on Atlas Cloud, and also syncs a voice the user recorded. Use when someone needs the voice/narration/voz/locución for a script, wants to use their cloned voice, wants to sync their own recording, or as step 3 of collage-reel.
license: MIT
---

# Collage Voice: narration with emotion + exact timing

Input: `<project>/script/script.json` and `script.txt` (one spoken line per scene), or a recording the user provides.
Output in `<project>/voice/`: `tts.txt`, `voice.mp3`, `voice.json`, `voice.js` (+ `transcript.json` when there is one; format in `collage-reel/references/project-format.md`). `phrases[i]` must be script line `i`.

Scripts are in this skill's `scripts/` folder. Run them from the project root.

## 1 · The text, with emotions
ElevenLabs v4 reads **audio tags** in square brackets as stage directions: it acts them and never says them. Every line of `script.json` carries its emotion in `delivery` (written by `collage-script`; if a line has none, pick one now).

Build `voice/tts.txt`: one line per script line, its `delivery` in front:
```
[curious] In 1936, Alan Turing imagined a machine.
[softly, amazed] It was made of nothing but a strip of paper tape.
[excited] And it could compute anything that can be computed.
[whispers] Every phone in every pocket still works that way.
```
- One or two tags per line. Tags that work well for narration: `[curious]`, `[mysterious]`, `[amazed]`, `[excited]`, `[serious]`, `[softly]`, `[whispers]`, `[warmly]`, `[dramatically]`, `[sighs]`, `[laughs softly]`, `[pause]`.
- Follow the arc: a hook that intrigues, calm context, rising energy on the escalation, a quieter or more intimate payoff. Same tag on every line sounds flat.
- Tags live only in `tts.txt` and `delivery`. `script.txt` stays clean: captions and sync come from it.
- Line breaks give the pauses the sync relies on: never join two lines.

## 2 · Path A · ElevenLabs connector (default)
The connector bills the user's ElevenLabs plan (characters), and it is the way to use **their own cloned voice**.

Tools (claude.ai ElevenLabs connector, tested): `creative_list_voices`, `creative_generate_speech`, `creative_get_flow_run_status`, `creative_transcribe_audio`, `account_get_usage`, `creative_get_model_guide`. If they aren't in the session (ToolSearch `elevenlabs` finds nothing), tell the user to connect ElevenLabs in their claude.ai connector settings and start a new session, or offer Path B (Atlas) or Path C.

1. **Voice.** `creative_list_voices` (pass `languages` when known). The user's clone shows `"category": "cloned"`; use it when they ask for their voice (if there are several, list them and ask). Otherwise a library voice that fits (warm, low and unhurried for history and mystery explainers, e.g. `search: "warm storytelling"`, `use_cases: ["narrative_story"]`). A `voice_id` only ever comes from this list or the user. A clone speaks other languages with its own timbre and accent: check `script.json` `lang` against the clone's language and mention it if they differ.
2. **Model.** `model_id: "eleven_v4"` always (the tags need v4 or v3; older models read them aloud). v4 has no speed or stability settings to pass: pace and tone come only from tags (`[slowly]`, `[pause]`, `[softly]`), punctuation (… for longer pauses, — for a beat) and sparing CAPITALS for emphasis.
3. **Cost.** `account_get_usage` for the characters left, then `creative_generate_speech` with `estimate_only: true` and the same arguments. Show the voice, model, character count and estimate; **wait for the user's OK**.
4. **Generate.** `creative_generate_speech` with `prompt: <tts.txt>`, `model_id: "eleven_v4"`, `voice_id`, **`generations_count: 1`** (the default 2 doubles the cost; use 2 only if the user wants takes to pick from). Keep the returned `flow_id` in `voice/voice.meta.json`: a transcription or re-take goes on the same flow. Never call it again to retry: every call is charged.
5. **Fetch.** Poll `creative_get_flow_run_status` with `flow_id` and `session_ids`, waiting `poll_after_seconds` between calls, until `all_completed` (or `has_failures`: report it, don't resubmit). Download the generated audio URL to `voice/voice.mp3` (`curl -L -o …`; convert with `ffmpeg -i in.wav voice/voice.mp3` if needed). The flow `url` lets the user open it on the ElevenLabs canvas, switch voice or regenerate there.
6. **Length.** `ffprobe -v error -show_entries format=duration -of csv=p=0 voice/voice.mp3`. Far from the target: change the script or the pace tags; don't stretch audio.

A line read wrong (bad emotion, mispronounced name): regenerate only that line with the same voice, then splice it in at the same line boundary with ~0.4 s of silence on each side (`ffmpeg -f concat`). Mispronounced names: on v4 write the word as IPA between slashes in `tts.txt` (`/ˈtjʊərɪŋ/`), never in `script.txt`.

## 3 · Path B · ElevenLabs on Atlas Cloud (no ElevenLabs connector)
Library voices only (no clone). Model `elevenlabs/v4/text-to-speech` (`…/v4-turbo/…` costs half); read its parameters with `atlas_get_model_info`. Call `atlas_generate_audio` with `{"text": "<tts.txt>"}` without `confirmed` to get the quote (≈ $0.01 per 40 s), **wait for the user's OK**, call again with `confirmed: true`, the same arguments, `idempotency_key` and `confirmation_token`. Poll `atlas_get_prediction`, download to `voice/voice.mp3`.

## 4 · Build the cues
A generated voice is clean and pauses at every line break, so the pauses give exact scene cuts and the short pauses inside each line pin the word timings:
```bash
node "<skill dir>/scripts/voice-sync.mjs" voice/voice.mp3 --script script/script.txt --out voice/voice
```
Check the printout says `N speech segments · N phrases` with N = number of script lines. If the counts differ (an emotional tag like `[sighs]` can add a breath, or two lines ran together), generate per line and join with ~0.5 s of silence.

**Exact words (better).** ElevenLabs Scribe returns a start/end time for every word. On the voice's flow: pin the take with `creative_add_flow_asset_node` (its `generation_id` from the run status), or for a recording use `creative_create_asset_upload` (name, mime type, exact byte size) → PUT the bytes → `creative_finalize_asset_upload` with the `flow_id`. Then `creative_transcribe_audio` with `model_id: "eleven_scribe_v1"`, `flow_id` and `connect_from: [<that node_id>]`; poll `creative_get_flow_run_status`; download `words_download_url` (or save `transcripts[0]`) to `voice/transcript.json` and use it instead:
```bash
node "<skill dir>/scripts/voice-json.mjs" voice/transcript.json --audio voice/voice.mp3 --script script/script.txt --out voice/voice
```
It aligns to the script, so STT typos and non-verbal sounds (laughs, sighs) never reach the captions. Look for `100% matched`.

## 5 · Path C · The user recorded the voice
Copy it to `voice/voice.mp3` (`ffmpeg -i in.m4a voice/voice.mp3`). Make `script.txt` match what was said, then build the cues (step 4). A human recording has fewer clean pauses: if the segment count doesn't match the lines, use a word-timestamp transcript with `voice-json.mjs`. A draft voice on macOS: `say -v Samantha -o /tmp/v.aiff "$(cat script/script.txt)" && ffmpeg -i /tmp/v.aiff voice/voice.mp3`.

## Check and show
Show the cue table (`cue(i)  start–end  [emotion] line`), the total length, the voice and model used, and the cost (characters or dollars). Remind the user you can't hear audio: they should listen to `voice/voice.mp3`, especially whether each emotion landed. A badly read line is cheaper to redo now than after the scenes.
