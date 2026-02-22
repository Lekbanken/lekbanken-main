# SFX Assets — Sound Design v1

Drop short mp3 files here to override the WebAudio fallback tones:

| File | Purpose | Duration |
|---|---|---|
| `ui-tick.mp3` | Drawer open/close | 30–60ms |
| `ui-tap.mp3` | Artifact expand/collapse | 40–80ms |
| `ui-confirm.mp3` | Decision submit | 80–140ms |

## Guidelines

- Keep files **under 5KB each** (short, dry, no reverb)
- Normalize to **-20 dB** — the utility applies its own volume scaling
- Mono, 44.1kHz, 64kbps CBR is sufficient
- Test on iOS Safari (requires user gesture to play)

Until real mp3s are added, `playSfx()` falls back to WebAudio synthesis.
