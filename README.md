# Sketch

A voice tutor that teaches on a shared whiteboard. Bring your course material, talk through what you don't understand, and work it out together on the board.

Arabic by default, fully right-to-left. Prototype stage: see [PROTOTYPE.md](PROTOTYPE.md).

## How it works

1. Drop a PDF (or notes) and optionally type your question.
2. The board opens and a live voice call starts.
3. The tutor summarizes the material, then explains step by step while drawing progressively.
4. Cut in any time by talking or typing: voice and pen stop together, and the answer is drawn in a fresh spot.

## Stack

- [TanStack Start](https://tanstack.com/start) on Cloudflare Workers
- [ElevenLabs Agents](https://elevenlabs.io/docs/eleven-agents) for realtime voice (WebRTC), with the files in its knowledge base
- [Excalidraw](https://excalidraw.com) for the board

## Run locally

```sh
bun install
cp .dev.vars.example .dev.vars   # add ELEVENLABS_API_KEY
bun run agent                    # sets up the tutor agent, writes ELEVENLABS_AGENT_ID
bun dev                          # http://localhost:3000
```

## Contributors

See [CONTRIBUTORS.md](CONTRIBUTORS.md).
