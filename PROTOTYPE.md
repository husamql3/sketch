# PROTOTYPE: voice tutor on a shared board

Throwaway. It answers one question:

> Can one timeline drive the tutor's speech and its progressive drawing, so that when the student cuts in, voice and pen stop together and the answer continues somewhere else on the board?

## Run (about 5 minutes)

1. `cp .dev.vars.example .dev.vars` and fill `ELEVENLABS_API_KEY`.
2. `bun run agent` gives the ElevenLabs agent its prompt and `draw_on_board` client tool. It updates `ELEVENLABS_AGENT_ID` if set (backup in `.agent-backup.json`), otherwise creates one.
3. `bun dev`, then open http://localhost:3000 in Chrome and allow the mic.

## Try this

1. Drop a lecture PDF and type "velocity-time graphs" (or leave it blank and say it).
2. The tutor gives a ~10 s summary and starts drawing axes while talking.
3. While it draws the line, say "wait, why is the slope acceleration?"
4. Watch: voice stops, the pen stops mid-stroke, the beat is marked `cut` in the timeline, and the answer is drawn in a new figure to the right.
5. Say "ok, continue". It should go back to the original figure by name.

## How the pieces fit

- `src/tutor/timeline.ts`: the pure module worth keeping. Speech, beats, and interruptions share one ordered log. An interruption cuts the beat being drawn, and a cut beat can never progress.
- `draw_on_board(figure, caption, marks)`: an ElevenLabs client tool. The voice agent writes the marks itself (JSON, format in its prompt); the board validates them and the pen (`src/tutor/pen.ts`) draws them at marker speed. It blocks until the beat is drawn or cut, so the agent can't describe marks that aren't on the board yet.
- `/api/intake`: uploads the files to the ElevenLabs knowledge base and attaches them to the agent (full text in its prompt) before the call starts. A hidden `[session start]` message names them, so the agent's first words are a summary of the real material.
- Interruptions come from ElevenLabs `onInterruption`, a user transcript arriving mid-draw, or typing in the dock.

## Open questions to judge

- Does blocking on each beat sound natural, or are the pauses too long? The fallback is a non-blocking tool with a queue.
- Is the voice agent's LLM good enough at coordinates? Change it on the agent (`bun run agent` keeps the current one).
- Should the agent see what the student draws? Not wired: the student's strokes are invisible to the agent.

## Known gaps

- No persistence. Reload and the session is gone.
- shadcn AI Elements are not used. The composer is ~60 lines of Tailwind. Swap in `PromptInput` when building the real thing.
