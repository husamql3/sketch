# Security Policy

## Supported versions

Sketch is a prototype. Only the latest commit on `main` is supported.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately by email to **husamahmud@gmail.com** with:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept
- Any suggested fix

You'll get an acknowledgement within 72 hours. We'll keep you updated, fix confirmed issues as fast as we can, and credit you in the fix unless you'd rather stay anonymous.

## Known limitations

These are known and tracked in the [roadmap](README.md#roadmap). Reports that add new impact are still welcome.

- `/api/intake` and `/api/voice-token` have no authentication or rate limiting. A public deployment lets anyone use the deployer's ElevenLabs quota.
- All sessions share one ElevenLabs agent, so `/api/intake` replaces that agent's knowledge base. On a shared deployment, one user's uploaded files can be visible to the next session's tutor. Don't upload sensitive documents to a shared deployment.

## Handling secrets

- `ELEVENLABS_API_KEY` must only be used server-side. Keep it in `.dev.vars` locally and in Wrangler secrets in production.
- Never commit `.dev.vars` or `.agent-backup.json`. If you leak a key, revoke it in the ElevenLabs dashboard right away.
