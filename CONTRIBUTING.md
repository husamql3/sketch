# Contributing to Sketch

Thanks for helping out. This is a hackathon prototype, so small, focused PRs are the easiest to review and merge.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Local setup

You need [Bun](https://bun.sh) and an [ElevenLabs](https://elevenlabs.io) API key with access to Agents.

```sh
git clone https://github.com/<your-username>/sketch.git   # your fork
cd sketch
bun install
cp .dev.vars.example .dev.vars   # add ELEVENLABS_API_KEY
bun run agent                    # creates the tutor agent, writes ELEVENLABS_AGENT_ID
bun dev                          # http://localhost:3000
```

Use your own ElevenLabs key and agent. Never commit `.dev.vars` or `.agent-backup.json` (both are git-ignored).

You can work on most of the UI, `timeline.ts`, `pen.ts`, and `elements.ts` without a key: `bun run typecheck` and `bun run build` don't need one.

## Branch workflow

1. Fork the repo and create a branch from `main`:
   ```sh
   git switch -c feat/short-description
   ```
   Prefixes: `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`.
2. Make your change. Keep unrelated changes out of the PR.
3. Run the checks CI runs:
   ```sh
   bun run typecheck
   bun run build
   ```
4. Commit using [Conventional Commits](https://www.conventionalcommits.org), as the existing history does:
   ```
   feat(tutor): draw a grid behind graph figures
   fix(intake): reject empty files
   docs(readme): clarify agent setup
   ```
5. Push to your fork and open a PR against `main`. Fill in the template.

## Coding conventions

- TypeScript in strict mode. No `any` unless there's no reasonable alternative.
- Match the existing style: 2-space indent, single quotes, no semicolons.
- Keep `src/tutor/timeline.ts` pure: no DOM, Excalidraw, or ElevenLabs imports.
- Validate anything that comes from the voice agent (see `parseMarks` and `elements.ts`) before it reaches the board.
- The ElevenLabs API key stays server-side. The browser only gets the short-lived token from `/api/voice-token`.
- User-facing text is Arabic and the layout is RTL. Use logical CSS properties (`ms-`, `me-`, `start`, `end`) rather than `left`/`right`.
- Comments explain *why*, not *what*. Mark known shortcuts with `// shortcut:` and the reason.
- Don't add a dependency for something a few lines can do.

## Pull requests

- Link the issue it closes (`Closes #12`).
- Describe what changed and how you tested it. For UI or drawing changes, add a screenshot or short recording.
- CI (typecheck and build) must pass.
- A maintainer will review. Expect a few rounds of feedback on bigger changes.

## Good first contributions

See the roadmap in the [README](README.md#roadmap) and the gaps in [PROTOTYPE.md](PROTOTYPE.md). Unit tests for the `timeline.ts` reducer are a self-contained place to start.

## Contributors

Add yourself to [CONTRIBUTORS.md](CONTRIBUTORS.md) in your first PR if you'd like.
